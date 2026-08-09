import styles from '../../styles/home.module.css';

export default function Header() {
    return (
        <header className={styles.header}>
            <h1>
                Protect your loved ones anytime, anywhere — an intelligent AI.
                <br />
                <span>System that detects and alerts instantly when a fall is detected.</span>
            </h1>
        </header>
    );
}
