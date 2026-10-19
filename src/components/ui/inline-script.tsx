// Pattern từ docs Next 16 (preventing-flash-before-hydration):
// React dev cảnh báo khi render ra <script>; type="text/plain" ở client
// khiến React không thực thi lại, suppressHydrationWarning bỏ qua mismatch.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
