interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-6 border-b border-ink-600">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative pb-3 text-sm font-medium transition-colors ${
            active === tab.id ? "text-mist-50" : "text-mist-400 hover:text-mist-200"
          }`}
        >
          {tab.label}
          {active === tab.id && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-signal" />
          )}
        </button>
      ))}
    </div>
  );
}
