import { Search, Settings, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  return (
    <header className="h-12 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-white">Rune Weaver</span>
          <span className="text-xs text-white/40">/</span>
          <span className="text-xs text-white/60">Dota2 Feature Workspace</span>
        </div>
      </div>

      {/* Right: Search + User */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="搜索 features..."
            className="w-64 h-8 pl-9 bg-[#252525] border-white/10 text-sm text-white placeholder:text-white/40 focus:border-[#6366f1] focus:ring-[#6366f1]/20"
          />
        </div>

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

        <button className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
          <Settings className="h-4 w-4 text-white/50" />
        </button>
      </div>
    </header>
  );
}
