import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: 'SurveyPro - Nền tảng Khảo sát Chuyên nghiệp',
  description: 'Tạo và quản lý khảo sát dự án dễ dàng với SurveyPro',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
