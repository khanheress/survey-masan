export function loginErrorMessage(result) {
  if (result?.ok && !result.error) return null;
  if (result?.error === 'CredentialsSignin') return 'Tên đăng nhập hoặc mật khẩu không đúng.';
  if (result?.error === 'AUTH_DATABASE_UNAVAILABLE') return 'Không thể kết nối dữ liệu tài khoản. Vui lòng liên hệ quản trị viên kiểm tra cấu hình cơ sở dữ liệu trên hosting.';
  if (result?.error === 'Configuration') return 'Máy chủ chưa được cấu hình đăng nhập đầy đủ. Vui lòng liên hệ quản trị viên.';
  return 'Không thể đăng nhập do lỗi máy chủ hoặc kết nối. Vui lòng thử lại sau.';
}
