const colorGroups = [
  {
    title: "Neutral",
    tokens: [
      ["background", "--background"],
      ["foreground", "--foreground"],
      ["card", "--card"],
      ["muted", "--muted"],
      ["muted-foreground", "--muted-foreground"],
      ["accent", "--accent"],
      ["accent-foreground", "--accent-foreground"],
      ["border", "--border"],
      ["secondary", "--secondary"],
      ["secondary-foreground", "--secondary-foreground"],
    ],
  },
  {
    title: "Primary",
    tokens: [
      ["primary", "--primary"],
      ["primary-foreground", "--primary-foreground"],
    ],
  },
  {
    title: "Semantic",
    tokens: [
      ["danger", "--danger"],
      ["danger-foreground", "--danger-foreground"],
      ["success", "--success"],
      ["success-foreground", "--success-foreground"],
      ["warning", "--warning"],
      ["warning-foreground", "--warning-foreground"],
      ["info", "--info"],
      ["info-foreground", "--info-foreground"],
    ],
  },
];

const typeScale = [
  ["Display", "text-4xl font-semibold tracking-tight", "Tiêu đề trang"],
  ["H1", "text-3xl font-semibold tracking-tight", "Tiêu đề mục lớn"],
  ["H2", "text-2xl font-semibold tracking-tight", "Tiêu đề mục"],
  ["H3", "text-xl font-medium", "Tiêu đề nhỏ"],
  ["Body", "text-base", "Nội dung chính"],
  ["Small", "text-sm text-muted-foreground", "Mô tả phụ"],
  ["Mono", "font-mono text-sm", "Code, token, đường dẫn"],
];

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Foundations</h1>
        <p className="text-muted-foreground">
          Design tokens được định nghĩa một lần tại{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            src/styles/tokens.css
          </code>{" "}
          và dùng chung cho cả hai app. Theme chuyển qua thuộc tính{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            data-theme
          </code>{" "}
          trên{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            &lt;html&gt;
          </code>{" "}
          (nút chuyển ở góc trên bên trái), mặc định theo hệ thống.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Màu sắc</h2>
        {colorGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="text-lg font-medium">{group.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {group.tokens.map(([name, variable]) => (
                <div
                  key={variable}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <div
                    className="h-10 rounded-md border border-border"
                    style={{ backgroundColor: `var(${variable})` }}
                  />
                  <p className="text-sm font-medium">{name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {variable}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Bóng đổ — Neumorphism
        </h2>
        <p className="text-muted-foreground">
          Bóng kép mềm (dual soft shadows) từ{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            --shadow-light
          </code>{" "}
          và{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            --shadow-dark
          </code>{" "}
          tạo hiệu ứng nổi (raised) và lõm (inset). Bề mặt demo phải cùng màu
          nền{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            --background
          </code>
          .
        </p>
        <div className="flex flex-wrap items-start gap-8 rounded-lg border border-border bg-card p-6">
          {(
            [
              ["shadow-nm-sm", "Raised nhỏ — thẻ con, icon"],
              ["shadow-nm", "Raised — thẻ, nút, ô nhập"],
              ["shadow-nm-lg", "Raised lớn — panel, modal"],
              ["shadow-nm-inset", "Inset — ô nhập, vùng lõm"],
              ["shadow-nm-pressed", "Pressed — nút đang nhấn"],
            ] as const
          ).map(([utility, description]) => (
            <div key={utility} className="flex flex-col items-center gap-3">
              <div
                className={`h-20 w-20 rounded-2xl bg-background ${utility}`}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {utility}
              </span>
              <span className="max-w-28 text-center text-xs leading-5 text-muted-foreground">
                {description}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Typography</h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {typeScale.map(([name, classes, description]) => (
            <div key={name} className="flex items-baseline gap-6 p-4">
              <p className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
                {name}
              </p>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className={classes}>Smart PPE Monitoring</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
