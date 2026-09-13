import { CodeIcon, ExportIcon, SettingsIcon } from "./atoms/icons"
export default function Navigation({
  mode,
  onModeChange,
}: {
  mode: ToolMode
  onModeChange: (
    mode: ToolMode,
  ) => void
}) {
  const items: {
    mode: ToolMode
    icon: React.ReactNode
    label: string
  }[] = [
      {
        mode: 'code',
        icon: <CodeIcon />,
        label: 'Code',
      },
      {
        mode: 'export',
        icon: <ExportIcon />,
        label: 'Export',
      },
      {
        mode: 'settings',
        icon: <SettingsIcon />,
        label: 'Settings',
      },
    ]

  return (
    <nav
      className="
        flex
        h-full
        w-14
        shrink-0
        flex-col
        items-center
        border-r
        border-ctp-surface0
        bg-ctp-crust
        py-2
      "
    >
      {items.map(item => (
        <button
          key={item.mode}
          onClick={() =>
            onModeChange(item.mode)
          }
          title={item.label}
          className={`
            mb-1
            flex
            h-10
            w-10
            cursor-pointer
            items-center
            justify-center
            rounded
            font-mono
            text-xs
            transition
            ${mode === item.mode
              ? 'bg-ctp-surface0 text-ctp-text'
              : 'text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text'
            }
          `}
        >
          <span className="flex h-5 w-5 items-center justify-center">
            {item.icon}
          </span>
        </button>
      ))}
    </nav>
  )
}
