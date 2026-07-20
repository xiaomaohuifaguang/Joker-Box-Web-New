import {
  AlignJustify,
  AlarmClock,
  AlertCircle,
  Archive,
  AtSign,
  Award,
  Bell,
  Binary,
  Bot,
  Book,
  BookOpen,
  Bookmark,
  Braces,
  Brain,
  BrainCircuit,
  Brush,
  Bug,
  Building,
  Building2,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle,
  CircleDot,
  CircuitBoard,
  Clipboard,
  Clock,
  Cloud,
  Code,
  Code2,
  Cog,
  Command,
  Compass,
  Contact,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileCode,
  FileSignature,
  FileText,
  Files,
  Film,
  Filter,
  Fingerprint,
  Flag,
  Flame,
  Folder,
  FolderOpen,
  FolderTree,
  FormInput,
  Gift,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Globe,
  Grid2x2,
  Hammer,
  HardDrive,
  Hash,
  Headphones,
  Heart,
  HelpCircle,
  History,
  Home,
  Hourglass,
  Image as ImageIcon,
  Inbox,
  Info,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Link,
  ListChecks,
  ListOrdered,
  ListTree,
  Lock,
  Mail,
  MailOpen,
  Mailbox,
  Map,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Music,
  Navigation,
  Network,
  Newspaper,
  Notebook,
  Package,
  Palette,
  PanelsTopLeft,
  Pencil,
  Phone,
  Plug,
  Play,
  Radar,
  Receipt,
  RefreshCw,
  Route,
  Rss,
  Ruler,
  Save,
  ScanSearch,
  Scissors,
  ScrollText,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  Sheet,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquarePen,
  SquareTerminal,
  Star,
  StickyNote,
  Store,
  Table,
  Tag,
  Tags,
  Terminal,
  TextCursorInput,
  Timer,
  Trophy,
  Unlock,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Wallet,
  Webhook,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";

// 菜单图标按类别分组（IconPicker 渲染用）。新增图标需同步：import + 下方 MenuIcon switch 补一例。
export const MENU_ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "布局 / 导航",
    icons: [
      "LayoutDashboard",
      "LayoutGrid",
      "LayoutList",
      "Home",
      "Compass",
      "Map",
      "Navigation",
      "Route",
      "PanelsTopLeft",
      "Grid2x2",
    ],
  },
  {
    label: "用户 / 角色",
    icons: ["Users", "User", "UserPlus", "UserMinus", "UserCheck", "Contact"],
  },
  {
    label: "安全 / 权限",
    icons: [
      "Shield",
      "ShieldCheck",
      "ShieldAlert",
      "KeyRound",
      "Lock",
      "Unlock",
      "Fingerprint",
    ],
  },
  {
    label: "机构 / 组织",
    icons: ["Building2", "Building", "Network", "Share2"],
  },
  {
    label: "文件 / 内容",
    icons: [
      "FileText",
      "FileCode",
      "File",
      "Files",
      "Folder",
      "FolderOpen",
      "FolderTree",
      "Newspaper",
      "BookOpen",
      "Book",
      "Notebook",
      "StickyNote",
      "ScrollText",
    ],
  },
  {
    label: "代码 / 终端",
    icons: [
      "Code2",
      "Terminal",
      "GitBranch",
      "GitMerge",
      "GitPullRequest",
      "Binary",
      "Braces",
    ],
  },
  {
    label: "数据 / 存储",
    icons: [
      "Database",
      "HardDrive",
      "Save",
      "Table",
      "Sheet",
      "Cloud",
      "Server",
      "Archive",
    ],
  },
  {
    label: "商务 / 物件",
    icons: [
      "ShoppingCart",
      "Package",
      "Tag",
      "Tags",
      "Wallet",
      "CreditCard",
      "Receipt",
      "Store",
      "Gift",
    ],
  },
  {
    label: "通信",
    icons: [
      "Mail",
      "MailOpen",
      "Mailbox",
      "MessageSquare",
      "MessageCircle",
      "Send",
      "Inbox",
      "AtSign",
      "Phone",
      "Smartphone",
      "Bell",
    ],
  },
  {
    label: "媒体",
    icons: ["Image", "Camera", "Film", "Video", "Music", "Mic", "Headphones", "Play"],
  },
  {
    label: "时间",
    icons: [
      "Clock",
      "Calendar",
      "CalendarDays",
      "Timer",
      "History",
      "AlarmClock",
      "Hourglass",
      "RefreshCw",
    ],
  },
  {
    label: "状态 / 标记",
    icons: [
      "Star",
      "Heart",
      "Bookmark",
      "Flag",
      "Eye",
      "EyeOff",
      "Filter",
      "Info",
      "HelpCircle",
      "AlertCircle",
      "CheckCircle",
      "CircleDot",
      "Sparkles",
      "Flame",
      "Zap",
      "Award",
      "Trophy",
    ],
  },
  {
    label: "系统 / 后台",
    icons: [
      "Menu",
      "ListTree",
      "AlignJustify",
      "Webhook",
      "Plug",
      "FormInput",
      "TextCursorInput",
      "SquarePen",
      "FileSignature",
      "Workflow",
      "Bot",
      "Brain",
      "BrainCircuit",
      "Cpu",
      "CircuitBoard",
      "Command",
      "SquareTerminal",
      "Bug",
      "ScanSearch",
      "Radar",
      "Rss",
      "Hash",
      "ListOrdered",
      "Code",
      "Layers",
    ],
  },
  {
    label: "工具 / 全局",
    icons: [
      "Settings",
      "Wrench",
      "Cog",
      "Hammer",
      "Palette",
      "Brush",
      "Globe",
      "Link",
      "ExternalLink",
      "Search",
      "SlidersHorizontal",
      "Pencil",
      "Clipboard",
      "ListChecks",
      "Ruler",
      "Scissors",
    ],
  },
];

// 菜单图标渲染组件：按名字符串返回对应 lucide 图标 JSX。
// 用硬编码 switch 直接返回 <Icon/>，规避 react-hooks/static-components
// （不在 render 期把组件类型赋给变量再渲染）。空串/未知 -> 返回 null（不渲染，无兜底）。
// 注意：ConsoleSidebar / Header 导航渲染读 menu.icon 字段。
export function MenuIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  switch (name) {
    // 布局 / 导航
    case "LayoutDashboard":
      return <LayoutDashboard className={className} />;
    case "LayoutGrid":
      return <LayoutGrid className={className} />;
    case "LayoutList":
      return <LayoutList className={className} />;
    case "Home":
      return <Home className={className} />;
    case "Compass":
      return <Compass className={className} />;
    case "Map":
      return <Map className={className} />;
    case "Navigation":
      return <Navigation className={className} />;
    case "Route":
      return <Route className={className} />;
    case "PanelsTopLeft":
      return <PanelsTopLeft className={className} />;
    case "Grid2x2":
      return <Grid2x2 className={className} />;
    // 用户 / 角色
    case "Users":
      return <Users className={className} />;
    case "User":
      return <User className={className} />;
    case "UserPlus":
      return <UserPlus className={className} />;
    case "UserMinus":
      return <UserMinus className={className} />;
    case "UserCheck":
      return <UserCheck className={className} />;
    case "Contact":
      return <Contact className={className} />;
    // 安全 / 权限
    case "Shield":
      return <Shield className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "ShieldAlert":
      return <ShieldAlert className={className} />;
    case "KeyRound":
      return <KeyRound className={className} />;
    case "Lock":
      return <Lock className={className} />;
    case "Unlock":
      return <Unlock className={className} />;
    case "Fingerprint":
      return <Fingerprint className={className} />;
    // 机构 / 组织
    case "Building2":
      return <Building2 className={className} />;
    case "Building":
      return <Building className={className} />;
    case "Network":
      return <Network className={className} />;
    case "Share2":
      return <Share2 className={className} />;
    // 文件 / 内容
    case "FileText":
      return <FileText className={className} />;
    case "FileCode":
      return <FileCode className={className} />;
    case "File":
      return <File className={className} />;
    case "Files":
      return <Files className={className} />;
    case "Folder":
      return <Folder className={className} />;
    case "FolderOpen":
      return <FolderOpen className={className} />;
    case "FolderTree":
      return <FolderTree className={className} />;
    case "Newspaper":
      return <Newspaper className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "Book":
      return <Book className={className} />;
    case "Notebook":
      return <Notebook className={className} />;
    case "StickyNote":
      return <StickyNote className={className} />;
    case "ScrollText":
      return <ScrollText className={className} />;
    // 代码 / 终端
    case "Code2":
      return <Code2 className={className} />;
    case "Terminal":
      return <Terminal className={className} />;
    case "GitBranch":
      return <GitBranch className={className} />;
    case "GitMerge":
      return <GitMerge className={className} />;
    case "GitPullRequest":
      return <GitPullRequest className={className} />;
    case "Binary":
      return <Binary className={className} />;
    case "Braces":
      return <Braces className={className} />;
    // 数据 / 存储
    case "Database":
      return <Database className={className} />;
    case "HardDrive":
      return <HardDrive className={className} />;
    case "Save":
      return <Save className={className} />;
    case "Table":
      return <Table className={className} />;
    case "Sheet":
      return <Sheet className={className} />;
    case "Cloud":
      return <Cloud className={className} />;
    case "Server":
      return <Server className={className} />;
    case "Archive":
      return <Archive className={className} />;
    // 商务 / 物件
    case "ShoppingCart":
      return <ShoppingCart className={className} />;
    case "Package":
      return <Package className={className} />;
    case "Tag":
      return <Tag className={className} />;
    case "Tags":
      return <Tags className={className} />;
    case "Wallet":
      return <Wallet className={className} />;
    case "CreditCard":
      return <CreditCard className={className} />;
    case "Receipt":
      return <Receipt className={className} />;
    case "Store":
      return <Store className={className} />;
    case "Gift":
      return <Gift className={className} />;
    // 通信
    case "Mail":
      return <Mail className={className} />;
    case "MailOpen":
      return <MailOpen className={className} />;
    case "Mailbox":
      return <Mailbox className={className} />;
    case "MessageSquare":
      return <MessageSquare className={className} />;
    case "MessageCircle":
      return <MessageCircle className={className} />;
    case "Send":
      return <Send className={className} />;
    case "Inbox":
      return <Inbox className={className} />;
    case "AtSign":
      return <AtSign className={className} />;
    case "Phone":
      return <Phone className={className} />;
    case "Smartphone":
      return <Smartphone className={className} />;
    case "Bell":
      return <Bell className={className} />;
    // 媒体
    case "Image":
      return <ImageIcon className={className} />;
    case "Camera":
      return <Camera className={className} />;
    case "Film":
      return <Film className={className} />;
    case "Video":
      return <Video className={className} />;
    case "Music":
      return <Music className={className} />;
    case "Mic":
      return <Mic className={className} />;
    case "Headphones":
      return <Headphones className={className} />;
    case "Play":
      return <Play className={className} />;
    // 时间
    case "Clock":
      return <Clock className={className} />;
    case "Calendar":
      return <Calendar className={className} />;
    case "CalendarDays":
      return <CalendarDays className={className} />;
    case "Timer":
      return <Timer className={className} />;
    case "History":
      return <History className={className} />;
    case "AlarmClock":
      return <AlarmClock className={className} />;
    case "Hourglass":
      return <Hourglass className={className} />;
    case "RefreshCw":
      return <RefreshCw className={className} />;
    // 状态 / 标记
    case "Star":
      return <Star className={className} />;
    case "Heart":
      return <Heart className={className} />;
    case "Bookmark":
      return <Bookmark className={className} />;
    case "Flag":
      return <Flag className={className} />;
    case "Eye":
      return <Eye className={className} />;
    case "EyeOff":
      return <EyeOff className={className} />;
    case "Filter":
      return <Filter className={className} />;
    case "Info":
      return <Info className={className} />;
    case "HelpCircle":
      return <HelpCircle className={className} />;
    case "AlertCircle":
      return <AlertCircle className={className} />;
    case "CheckCircle":
      return <CheckCircle className={className} />;
    case "CircleDot":
      return <CircleDot className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "Zap":
      return <Zap className={className} />;
    case "Award":
      return <Award className={className} />;
    case "Trophy":
      return <Trophy className={className} />;
    // 系统 / 后台（菜单/API/表单/流程/系统提示/爬虫/AI/网址/码表）
    case "Menu":
      return <Menu className={className} />;
    case "ListTree":
      return <ListTree className={className} />;
    case "AlignJustify":
      return <AlignJustify className={className} />;
    case "Webhook":
      return <Webhook className={className} />;
    case "Plug":
      return <Plug className={className} />;
    case "FormInput":
      return <FormInput className={className} />;
    case "TextCursorInput":
      return <TextCursorInput className={className} />;
    case "SquarePen":
      return <SquarePen className={className} />;
    case "FileSignature":
      return <FileSignature className={className} />;
    case "Workflow":
      return <Workflow className={className} />;
    case "Bot":
      return <Bot className={className} />;
    case "Brain":
      return <Brain className={className} />;
    case "BrainCircuit":
      return <BrainCircuit className={className} />;
    case "Cpu":
      return <Cpu className={className} />;
    case "CircuitBoard":
      return <CircuitBoard className={className} />;
    case "Command":
      return <Command className={className} />;
    case "SquareTerminal":
      return <SquareTerminal className={className} />;
    case "Bug":
      return <Bug className={className} />;
    case "ScanSearch":
      return <ScanSearch className={className} />;
    case "Radar":
      return <Radar className={className} />;
    case "Rss":
      return <Rss className={className} />;
    case "Hash":
      return <Hash className={className} />;
    case "ListOrdered":
      return <ListOrdered className={className} />;
    case "Code":
      return <Code className={className} />;
    case "Layers":
      return <Layers className={className} />;
    // 工具 / 全局
    case "Settings":
      return <Settings className={className} />;
    case "Wrench":
      return <Wrench className={className} />;
    case "Cog":
      return <Cog className={className} />;
    case "Hammer":
      return <Hammer className={className} />;
    case "Palette":
      return <Palette className={className} />;
    case "Brush":
      return <Brush className={className} />;
    case "Globe":
      return <Globe className={className} />;
    case "Link":
      return <Link className={className} />;
    case "ExternalLink":
      return <ExternalLink className={className} />;
    case "Search":
      return <Search className={className} />;
    case "SlidersHorizontal":
      return <SlidersHorizontal className={className} />;
    case "Pencil":
      return <Pencil className={className} />;
    case "Clipboard":
      return <Clipboard className={className} />;
    case "ListChecks":
      return <ListChecks className={className} />;
    case "Ruler":
      return <Ruler className={className} />;
    case "Scissors":
      return <Scissors className={className} />;
    default:
      return null;
  }
}
