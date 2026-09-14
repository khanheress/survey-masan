export async function downloadCsv(url, filename = 'phan-hoi') {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Không thể xuất dữ liệu. Vui lòng thử lại.');
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
