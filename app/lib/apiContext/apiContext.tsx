'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { isTokenExpired } from 'app/Ultils/check_TokenExpired/isTokenExpired';

interface LoginData {
    email: string;
    password: string;
}

interface RegisterData {
    full_name: string;
    email: string;
    password: string;
    confirmPassword: string;
    date_of_birth: string;
    phone_number?: string;
}

interface LoginResponse {
    accessToken: string;
    user: {
        _id: string;
        full_name: string;
        email: string;
        age?: number;
        phone_number?: string;
        role: string;
    };
}

export interface RelativeResponse {
    user_id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    relationship: string;
    date_of_birth?: string;
    group_id?: string;
    source: 'family_group' | 'relative';
    acceptance_status: 'pending' | 'accepted' | 'denied';
}

export interface UserProfileResponse {
    user: {
        _id?: string;
        user_id: string | { _id: string; full_name: string; email: string };
        full_name: string;
        email: string;
        date_of_birth?: string;
        phone_number?: string;
        role: string;
        created_at: string;
        age?: number;
        require_face_id?: boolean;
    };
    relatives: RelativeResponse[];
    cameras: any[];
    activity_logs: any[];
    notifications: any[];
}

interface SearchUserResponse {
    data: Array<any>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface RelativeItem {
    _id: string;
    user_id: {
        _id: string;
        full_name: string;
        email: string;
    };
    relative_user_id: {
        _id: string;
        full_name: string;
        email: string;
    };
    relationship: string;
    acceptance_status: 'pending' | 'accepted' | 'denied';
    createdAt: string;
    updatedAt?: string;
}

export interface FamilyRequestResponse {
    pending: RelativeItem[];
    accepted: RelativeItem[];
    denied: RelativeItem[];
}

export interface FaceImageInput {
    angle: FaceAngle;
    image: string;
}

export interface RegisterFaceData {
    images: FaceImageInput[];
}

// ============================================================
// FACE ID TYPES
// ============================================================

export type FaceAngle = 'front' | 'left' | 'right' | 'up';

export interface FaceEmbeddingResponse {
    id: string;
    angle: FaceAngle;
    image: string;
    has_embedding: boolean;
    confidence: number;
}

export interface FaceUserResponse {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    age?: number;
    age_text?: string;
}

export interface FaceProfileResponse {
    id: string;
    user_id: string;
    user: FaceUserResponse;
    status: 'pending' | 'registered';
    registered_at: string | null;
    embeddings: FaceEmbeddingResponse[];
}

export interface FaceProfileApiResponse {
    success: boolean;
    data: FaceProfileResponse;
}

export interface RegisterFaceResponse {
    success: boolean;
    message: string;
    data: {
        user_id: string;
        face_profile_id: string;
        status: string;
        angles: FaceAngle[];
    };
}

// ============================================================
// FACE ID VERIFY LOGIN TYPES
// ============================================================

export interface VerifyFaceData {
    images: string[];
}

export interface VerifyFaceResponse {
    success: boolean;
    matched: boolean;
    confidence: number;
    token?: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface DeleteFaceResponse {
    success: boolean;
    message: string;
}

// ============================================================
// FACE ID REQUIRE / STATUS TYPES
// ============================================================

export interface FaceIdStatusResponse {
    require_face_id: boolean;
    has_face_profile: boolean;
    has_embeddings: boolean;
    embedding_count: number;
    face_status: string | null;
    registered_at: string | null;
    is_ready: boolean;
}

export interface UpdateRequireFaceIdResponse {
    require_face_id: boolean;
    message: string;
}

// ============================================================
// CONTEXT TYPE
// ============================================================

interface ApiContextType {
    accessToken: string | null;
    login: (data: LoginData) => Promise<LoginResponse>;
    register: (data: RegisterData) => Promise<LoginResponse>;
    getUserProfile: () => Promise<UserProfileResponse>;
    logout: () => void;
    searchUsers: (query: string, page?: number, limit?: number) => Promise<SearchUserResponse>;
    requestRelative: (relativeUserId: string, relationship: string) => Promise<any>;
    getFamilyRequest: () => Promise<FamilyRequestResponse>;
    acceptRelativeRequest: (requestId: string, relationship?: string) => Promise<any>;
    denyRelativeRequest: (requestId: string) => Promise<any>;
    getFamilyMembers: () => Promise<any>;
    createCamera: (cameraData: any) => Promise<any>;
    registerFace: (data: RegisterFaceData) => Promise<RegisterFaceResponse>;
    getFaceProfile: () => Promise<FaceProfileApiResponse>;
    verifyFace: (data: VerifyFaceData) => Promise<VerifyFaceResponse>;
    deleteFace: (userId: string) => Promise<DeleteFaceResponse>;
    getFaceIdStatus: () => Promise<FaceIdStatusResponse>;
    updateRequireFaceId: (requireFaceId: boolean) => Promise<UpdateRequireFaceIdResponse>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const apiUrl = 'http://localhost:8888/api/v1';

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token && !isTokenExpired(token)) {
            setAccessToken(token);
        } else {
            localStorage.removeItem('accessToken');
        }
        setIsReady(true);
    }, []);

    const showError = (msg: string) => {
        toast.error(msg, {
            position: 'top-right',
            autoClose: 5000,
        });
    };

    const showSuccess = (msg: string) => {
        toast.success(msg, {
            position: 'top-right',
            autoClose: 3000,
        });
    };

    // ============================================================
    // AUTH
    // ============================================================

    const login = async (data: LoginData): Promise<LoginResponse> => {
        try {
            const res = await axios.post(`${apiUrl}/auth/login`, data);
            const token = res.data.accessToken ?? res.data.token;

            if (!token) {
                throw new Error('Backend không trả về accessToken');
            }

            localStorage.setItem('accessToken', token);
            setAccessToken(token);
            showSuccess('Đăng nhập thành công!');

            return {
                accessToken: token,
                user: res.data.user,
            };
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Đăng nhập thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    const register = async (data: RegisterData): Promise<LoginResponse> => {
        try {
            const res = await axios.post(`${apiUrl}/auth/register`, data);
            const token = res.data.accessToken ?? res.data.token;
            const user = res.data.user;

            if (!token) {
                throw new Error('Backend không trả về accessToken');
            }

            localStorage.setItem('accessToken', token);
            setAccessToken(token);
            showSuccess('Đăng ký thành công! Đã đăng nhập tự động');

            return {
                accessToken: token,
                user,
            };
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Đăng ký thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        showSuccess('Đã đăng xuất');
    };

    // ============================================================
    // USER
    // ============================================================

    const getUserProfile = async (): Promise<UserProfileResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.get(`${apiUrl}/users/profile`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Không thể lấy thông tin người dùng';
            showError(msg);
            throw new Error(msg);
        }
    };

    const searchUsers = async (query: string, page = 1, limit = 20): Promise<SearchUserResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.get(`${apiUrl}/users/search_User`, {
                params: { q: query, page, limit },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Tìm kiếm thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    // ============================================================
    // RELATIVE / FAMILY
    // ============================================================

    const requestRelative = async (relativeUserId: string, relationship: string) => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.post(
                `${apiUrl}/relative/invite`,
                {
                    relative_user_id: relativeUserId,
                    relationship,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            showSuccess('Đã gửi yêu cầu người thân thành công!');
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Gửi yêu cầu thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    const getFamilyRequest = async (): Promise<FamilyRequestResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.get(`${apiUrl}/relative/family-requests`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });

            if (Array.isArray(res.data)) {
                return {
                    pending: res.data,
                    accepted: [],
                    denied: [],
                };
            }

            return {
                pending: res.data.pending ?? [],
                accepted: res.data.accepted ?? [],
                denied: res.data.denied ?? [],
            };
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Không thể tải danh sách';
            showError(msg);
            throw new Error(msg);
        }
    };

    const acceptRelativeRequest = async (requestId: string, relationship: string = 'Người thân') => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.post(
                `${apiUrl}/relative/respond/${requestId}`,
                {
                    action: 'accept',
                    relationship: relationship.trim(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                }
            );
            showSuccess('Đã chấp nhận kết nối người thân!');
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Chấp nhận thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    const denyRelativeRequest = async (requestId: string) => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.post(
                `${apiUrl}/relative/respond/${requestId}`,
                {
                    action: 'deny',
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                }
            );
            showSuccess('Đã từ chối lời mời');
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Từ chối thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    const getFamilyMembers = async (): Promise<any> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.get(`${apiUrl}/relative/family-members`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Không thể tải danh sách gia đình';
            showError(msg);
            throw new Error(msg);
        }
    };

    // ============================================================
    // CAMERA
    // ============================================================

    const createCamera = async (cameraData: any): Promise<any> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.post(`${apiUrl}/camera/create`, cameraData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            showSuccess('Tạo camera thành công!');
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Tạo camera thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    // ============================================================
    // FACE ID - REGISTER
    // ============================================================

    const registerFace = async (data: RegisterFaceData): Promise<RegisterFaceResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        if (!data?.images || data.images.length !== 4) {
            throw new Error('Cần đủ 4 ảnh khuôn mặt');
        }

        const requiredAngles: FaceAngle[] = ['front', 'left', 'right', 'up'];
        const receivedAngles = data.images.map((item) => item.angle);

        for (const angle of requiredAngles) {
            if (!receivedAngles.includes(angle)) {
                throw new Error(`Thiếu góc khuôn mặt: ${angle}`);
            }
        }

        try {
            const res = await axios.post(`${apiUrl}/face-id/register`, data, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                timeout: 120000,
            });

            showSuccess('Đăng ký khuôn mặt thành công!');
            return res.data;
        } catch (err: any) {
            console.error('❌ REGISTER FACE ERROR:', err);

            const responseMessage = err.response?.data?.message;
            const msg = Array.isArray(responseMessage)
                ? responseMessage.join(', ')
                : responseMessage || err.message || 'Đăng ký khuôn mặt thất bại';

            showError(msg);
            throw new Error(msg);
        }
    };

    const getFaceProfile = async (): Promise<FaceProfileApiResponse> => {
        if (!accessToken) throw new Error('Chưa đăng nhập');

        try {
            const res = await axios.get(`${apiUrl}/face-id/profile`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                timeout: 30000,
            });

            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Không thể lấy thông tin khuôn mặt';
            showError(msg);
            throw new Error(msg);
        }
    };

    // ============================================================
    // FACE ID - VERIFY LOGIN
    // ============================================================

    const verifyFace = async (data: VerifyFaceData): Promise<VerifyFaceResponse> => {
        if (!data?.images || !Array.isArray(data.images) || data.images.length < 2) {
            throw new Error('Cần ít nhất 2 ảnh khuôn mặt');
        }

        try {
            const res = await axios.post(`${apiUrl}/face-id/verify`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                timeout: 120000,
            });

            const result = res.data;

            if (result.success && result.token) {
                localStorage.setItem('accessToken', result.token);
                setAccessToken(result.token);
                showSuccess('Xác thực thành công!');
            }

            return result;
        } catch (err: any) {
            console.error('VERIFY FACE ERROR:', err);
            const msg = err.response?.data?.message || err.message || 'Xác thực khuôn mặt thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    const deleteFace = async (userId: string): Promise<DeleteFaceResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }
        if (!userId) {
            throw new Error('Không xác định được người dùng');
        }

        try {
            const res = await axios.delete(`${apiUrl}/face-id/profile/${userId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                timeout: 30000,
            });
            showSuccess('Đã xoá dữ liệu khuôn mặt');
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Xoá dữ liệu khuôn mặt thất bại';
            showError(msg);
            throw new Error(msg);
        }
    };

    // ============================================================
    // FACE ID - STATUS & REQUIRE
    // ============================================================

    const getFaceIdStatus = async (): Promise<FaceIdStatusResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.get(`${apiUrl}/users/face-id/status`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });

            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Không thể lấy trạng thái Face ID';
            showError(msg);
            throw new Error(msg);
        }
    };

    const updateRequireFaceId = async (requireFaceId: boolean): Promise<UpdateRequireFaceIdResponse> => {
        if (!accessToken) {
            throw new Error('Chưa đăng nhập');
        }

        try {
            const res = await axios.patch(
                `${apiUrl}/users/face-id/require`,
                { require_face_id: requireFaceId },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true',
                    },
                }
            );

            showSuccess(requireFaceId ? 'Đã bật yêu cầu xác thực Face ID' : 'Đã tắt yêu cầu xác thực Face ID');

            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Không thể cập nhật cài đặt Face ID';
            showError(msg);
            throw new Error(msg);
        }
    };

    // ============================================================
    // CONTEXT VALUE
    // ============================================================

    const value: ApiContextType = {
        accessToken,
        login,
        register,
        getUserProfile,
        logout,
        searchUsers,
        requestRelative,
        getFamilyRequest,
        acceptRelativeRequest,
        denyRelativeRequest,
        getFamilyMembers,
        createCamera,
        registerFace,
        getFaceProfile,
        deleteFace,
        verifyFace,
        getFaceIdStatus,
        updateRequireFaceId,
    };

    return <ApiContext.Provider value={value}>{isReady ? children : null}</ApiContext.Provider>;
};

export const useApi = (): ApiContextType => {
    const context = useContext(ApiContext);
    if (!context) {
        throw new Error('useApi phải được dùng trong ApiProvider');
    }
    return context;
};
