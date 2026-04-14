import { Search, Sparkles, Gamepad2, Swords } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type HostType = 'dota2' | 'war3';

interface HeaderProps {
  activeHost: HostType;
  onHostChange: (host: HostType) => void;
}

export function Header({ activeHost, onHostChange }: HeaderProps) {
  const hostLabels: Record<HostType, string> = {
    dota2: 'Dota2 Feature Workspace',
    war3: 'Warcraft3 Host Workspace',
  };

  return (
    <header className="h-12 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Logo + Host Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">Rune Weaver</span>
            <span className="text-xs text-white/40">/</span>
            <span className="text-xs text-white/60">{hostLabels[activeHost]}</span>
          </div>
        </div>

        {/* Host Workspace Switcher */}
        <div className="flex items-center gap-1 bg-[#252525] rounded-lg p-1 border border-white/5">
          <button
            onClick={() => onHostChange('dota2')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeHost === 'dota2'
                ? 'bg-[#6366f1] text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            )}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            Dota2
          </button>
          <button
            onClick={() => onHostChange('war3')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeHost === 'war3'
                ? 'bg-[#6366f1] text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            )}
          >
            <Swords className="h-3.5 w-3.5" />
            Warcraft3
          </button>
        </div>
      </div>

      {/* Right: Search + User */}
      <div className="flex items-center gap-4">
        {activeHost === 'dota2' && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="搜索 features..."
              className="w-64 h-8 pl-9 bg-[#252525] border-white/10 text-sm text-white placeholder:text-white/40 focus:border-[#6366f1] focus:ring-[#6366f1]/20"
            />
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#6366f1] text-white text-xs font-medium">
                  RW
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#1e1e1e] border-white/10">
            <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/5">
              个人设置
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/5">
              工作区设置
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/5">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
