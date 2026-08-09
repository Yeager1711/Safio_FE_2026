'use client';

import React, { useState } from 'react';
import {
    Menu,
    Home,
    Calendar,
    CheckSquare,
    BarChart3,
    FolderOpen,
    Settings,
    Plus,
    Search,
    Bell,
    User,
    Download,
    ChevronRight,
    Target,
    Clock,
    Archive,
    TrendingUp,
    Edit3,
    Trash2,
    MoreVertical,
} from 'lucide-react';
import styles from './dashboard.module.css';

export default function iDraftDashboard() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>S</div>
                        <span className={styles.logoText}>
                            Sa<span>fi</span>o
                        </span>
                    </div>
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={styles.collapseBtn}>
                        <Menu size={20} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {[
                        { icon: Home, label: 'Dashboard', active: true },
                        { icon: Calendar, label: 'Calendar' },
                        { icon: CheckSquare, label: 'My Tasks' },
                        { icon: BarChart3, label: 'Statistics' },
                        { icon: FolderOpen, label: 'Documents' },
                    ].map((item) => (
                        <button key={item.label} className={`${styles.navItem} ${item.active ? styles.active : ''}`}>
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className={styles.section}>
                    <h4>INTEGRATIONS</h4>
                    <div className={styles.integrationList}>
                        <button>
                            <div className={styles.slackIcon} /> Slack
                        </button>
                        <button>
                            <div className={styles.notionIcon} /> Notion
                        </button>
                        <button className={styles.addPlugin}>+ Add new plugin</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <h4>TEAMS</h4>
                    <div className={styles.teamList}>
                        <div className={styles.teamItem}>
                            <div className={styles.teamDotActive} /> SEO
                        </div>
                        <div className={styles.teamItem}>
                            <div className={styles.teamDot} /> Marketing
                        </div>
                    </div>
                </div>

                <button className={styles.settingsBtn}>
                    <Settings size={20} />
                    <span>Settings</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Header */}
                <header className={styles.header}>
                    <h1>Hi, Dylan!</h1>
                    <div className={styles.headerActions}>
                        <button className={styles.createBtn}>
                            <Plus size={20} /> Create
                        </button>
                        <button className={styles.iconBtn}>
                            <Search size={20} />
                        </button>
                        <button className={styles.iconBtn}>
                            <Bell size={20} />
                        </button>
                        <div className={styles.avatar}>D</div>
                    </div>
                </header>

                <div className={styles.grid}>
                    {/* Overall Information */}
                    <div className={styles.card + ' ' + styles.overallCard}>
                        <div className={styles.cardHeader}>
                            <h3>Thông tin chung</h3>
                            <MoreVertical size={18} />
                        </div>
                        <div className={styles.statsRow}>
                            <div className={styles.bigStat}>
                                <span className={styles.bigNumber}>43</span>
                                <span>Tasks done in all time</span>
                            </div>
                            <div className={styles.smallStat}>
                                <span>2</span> Projects are stopped
                            </div>
                        </div>
                        <div className={styles.numbersGrid}>
                            <div>
                                <strong>28</strong> Projects
                            </div>
                            <div>
                                <strong>14</strong> In Progress
                            </div>
                            <div>
                                <strong>11</strong> Completed
                            </div>
                        </div>
                    </div>

                    {/* Weekly Progress */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3>Dữ liệu hàng tuần</h3>
                            <TrendingUp size={18} />
                        </div>
                        <div className={styles.chartPlaceholder}>
                            <div className={styles.lineChart} />
                        </div>
                        <div className={styles.days}>M T W T F S S</div>
                    </div>

                    {/* Month Progress */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3>Dữ liệu theo tháng</h3>
                        </div>
                        <div className={styles.circularChart}>
                            <svg viewBox="0 0 36 36" className={styles.circular}>
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="3"
                                    strokeDasharray="80, 100"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className={styles.circularText}>120%</div>
                        </div>
                        <div className={styles.legend}>
                            <div>
                                <span className={styles.dotSport} /> Sport
                            </div>
                            <div>
                                <span className={styles.dotStudy} /> Study
                            </div>
                            <div>
                                <span className={styles.dotProject} /> Project
                            </div>
                        </div>
                        <button className={styles.downloadBtn}>
                            <Download size={16} /> Download Report
                        </button>
                    </div>

                    {/* Month Goals */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3>Phân tích dữ liệu lỗi tìm ẩn</h3>
                            <Edit3 size={18} />
                        </div>
                        <ul className={styles.goalsList}>
                            <li>
                                <Target size={18} /> Read 2 books
                            </li>
                            <li>
                                <Target size={18} /> Sports every day
                            </li>
                            <li>
                                <Target size={18} /> Complete the course
                            </li>
                            <li>
                                <Target size={18} /> Bend down with a parachute
                            </li>
                        </ul>
                    </div>

                    {/* Task In Process */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3>AI đang thực hiện</h3>
                        </div>
                        <div className={styles.taskList}>
                            <div className={styles.taskItem}>
                                <div className={styles.taskIcon}>
                                    <Archive size={20} />
                                </div>
                                <div>
                                    <strong>Buy Susan a gift for Birthday</strong>
                                    <div className={styles.taskDate}>Today</div>
                                </div>
                                <button className={styles.taskMore}>
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                            <div className={styles.taskItem}>
                                <div className={styles.taskIcon}>
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <strong>Doctor’s appointment on Tuesday</strong>
                                    <div className={styles.taskDate}>02.05.2023</div>
                                </div>
                                <button className={styles.taskMore}>
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>
                        <button className={styles.addTaskBtn}>+ Add task</button>
                    </div>

                    {/* Last Projects */}
                    <div className={styles.card + ' ' + styles.lastProjects}>
                        <h3>Last Projects</h3>
                        <div className={styles.projectGrid}>
                            <div className={styles.projectCard}>
                                <div className={styles.projectIconNew} />
                                <strong>New Schedule</strong>
                                <p>In progress</p>
                                <span>Done: develop a new plan to allow a...</span>
                            </div>
                            <div className={styles.projectCard}>
                                <div className={styles.projectIconAnim} />
                                <strong>Prototype animation</strong>
                                <p>Completed</p>
                            </div>
                            <div className={styles.projectCard}>
                                <div className={styles.projectIconAI} />
                                <strong>AI Project 2 part</strong>
                                <p>In progress</p>
                            </div>
                        </div>
                        <button className={styles.openArchive}>
                            Open archive <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
