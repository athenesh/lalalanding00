interface HeaderProps {
  title: string;
  userName?: string;
  description?: string;
}

export default function Header({ title, userName, description }: HeaderProps) {
  return (
    <div className="border-b border-border bg-muted/30">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        
        {userName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">{userName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

