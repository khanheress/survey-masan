'use client';

import Icon from '@/components/Icon';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    { icon: <Icon name="chart" />, title: 'Tạo khảo sát linh hoạt', desc: 'Công cụ kéo thả dễ dàng sử dụng, hỗ trợ nhiều loại câu hỏi đa dạng.' },
    { icon: <Icon name="link" />, title: 'Chia sẻ link dễ dàng', desc: 'Gửi link khảo sát tới bất kỳ ai chỉ với một cú click.' },
    { icon: <Icon name="download" />, title: 'Xuất dữ liệu nhanh', desc: 'Xuất dữ liệu phản hồi ra file CSV để dễ dàng phân tích.' },
    { icon: <Icon name="lock" />, title: 'Phân quyền bảo mật', desc: 'Quản lý người dùng và quyền truy cập chặt chẽ.' },
    { icon: <Icon name="phone-device" />, title: 'Tương thích mọi thiết bị', desc: 'Giao diện phản hồi đẹp mắt trên cả máy tính và điện thoại.' },
    { icon: <Icon name="activity" />, title: 'Thống kê trực quan', desc: 'Xem tiến độ và dữ liệu trả lời trực tiếp trong bảng điều khiển.' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative' }}>
      {/* Header/Nav */}
      <nav style={{ position: 'relative', zIndex: 10, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          SurveyPro
        </div>
        <div>
          <Link href="/login" className="btn btn-ghost" style={{ marginRight: '1rem' }}>Đăng nhập</Link>
          <Link href="/admin" className="btn btn-primary" style={{ borderRadius: '8px' }}>Bảng điều khiển</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ position: 'relative', zIndex: 10, padding: '4rem 2rem', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="animate-slideUp" style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 0' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Nền tảng Khảo sát <br />
            <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Chuyên nghiệp & Tối ưu
            </span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.6 }}>
            Giải pháp toàn diện giúp doanh nghiệp và tổ chức tạo, quản lý và phân tích các chiến dịch khảo sát một cách dễ dàng và hiệu quả nhất.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-primary btn-lg" style={{ borderRadius: '8px', padding: '16px 36px', fontSize: '1.125rem' }}>
              Bắt đầu ngay <Icon name="arrow-right" />
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg" style={{ borderRadius: '8px', padding: '16px 36px', fontSize: '1.125rem' }}>
              Tìm hiểu thêm
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" style={{ marginTop: '4rem', paddingTop: '4rem', borderTop: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '3rem' }}>Tính năng nổi bật</h2>
          <div className="grid-cols-3">
            {features.map((feature, i) => (
              <div key={i} className="glass-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s ease', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', marginTop: '4rem' }}>
        <p>© {new Date().getFullYear()} SurveyPro. Mọi quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}
