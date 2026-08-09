import 'normalize.css';
import './GlobalStyles/GlobalStyles.css';
import Header from './pages/DefaultLayouts/Header/page';
import { ApiProvider } from './lib/apiContext/apiContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'aos/dist/aos.css';

// Import script chống extension từ file riêng (tạo file mới ở dưới)
import './fix-extension-script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi">
            <head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
                />

                {/* Tắt một số extension phổ biến gây lỗi */}
                <meta name="darkreader-lock" content="true" />
                <meta name="momentum-dashboard" content="disabled" />
            </head>
            <body>
                <ApiProvider>
                    <Header />
                    <main className="container">{children}</main>
                    <ToastContainer
                        position="top-right"
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                    />
                </ApiProvider>
            </body>
        </html>
    );
}
