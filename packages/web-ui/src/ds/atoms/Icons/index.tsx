import {
  ArrowDownIcon,
  ArrowLeft,
  ArrowRightIcon,
  ArrowUpIcon,
  BarChart4,
  Bot,
  CalendarIcon,
  CheckCircle2,
  CheckIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUpIcon,
  ChevronsUpDown,
  ChevronUp,
  CircleAlert,
  CircleHelp,
  CirclePlus,
  Code,
  Code2,
  Copy,
  Ellipsis,
  EllipsisVertical,
  EqualApproximatelyIcon,
  EqualNotIcon,
  ExternalLink,
  Eye,
  File,
  FilePlus,
  FileQuestion,
  FileUpIcon,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Github,
  History,
  Image,
  ImageUp,
  InfoIcon,
  LetterText,
  ListOrdered,
  LoaderCircle,
  Lock,
  Logs,
  MinusIcon,
  MonitorIcon,
  Moon,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Puzzle,
  RefreshCcw,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  Sparkles,
  SquareArrowRight,
  SquareDot,
  SquareMinus,
  SquarePlus,
  Star,
  Sun,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash,
  Twitter,
  Undo,
  XIcon,
  Braces,
  ListCheck,
  Newspaper,
  CircleDollarSign,
  Globe,
  Maximize2,
  Minimize2,
  Thermometer,
  ListVideo,
  WholeWord,
  AlertCircle,
  CircleArrowUp,
  Blocks,
} from 'lucide-react'

import { cn } from '../../../lib/utils'
import { colors, DarkTextColor, type TextColor } from '../../tokens'
import {
  LatitudeLogo,
  LatitudeLogoMonochrome,
  GridVertical,
  MCP,
} from './custom-icons'

const Icons = {
  addCircle: CirclePlus,
  addSquare: SquarePlus,
  alert: CircleAlert,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRightIcon,
  barChart4: BarChart4,
  blocks: Blocks,
  bot: Bot,
  calendar: CalendarIcon,
  check: CheckCircle2,
  checkClean: CheckIcon,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronsUpDown: ChevronsUpDown,
  chevronsDownUp: ChevronsDownUpIcon,
  circleDollarSign: CircleDollarSign,
  circleHelp: CircleHelp,
  clipboard: Copy,
  code: Code,
  code2: Code2,
  deletion: SquareMinus,
  minus: MinusIcon,
  ellipsis: Ellipsis,
  ellipsisVertical: EllipsisVertical,
  externalLink: ExternalLink,
  eye: Eye,
  file: File,
  fileUp: FileUpIcon,
  filePlus: FilePlus,
  fileQuestion: FileQuestion,
  folderClose: FolderClosed,
  folderOpen: FolderOpen,
  folderPlus: FolderPlus,
  github: Github,
  globe: Globe,
  history: History,
  info: InfoIcon,
  listOrdered: ListOrdered,
  listVideo: ListVideo,
  loader: LoaderCircle,
  lock: Lock,
  logo: LatitudeLogo,
  logoMonochrome: LatitudeLogoMonochrome,
  maximize: Maximize2,
  mcp: MCP,
  minimize: Minimize2,
  modification: SquareDot,
  moon: Moon,
  monitor: MonitorIcon,
  newspaper: Newspaper,
  pencil: Pencil,
  pin: Pin,
  pinOff: PinOff,
  puzzle: Puzzle,
  refresh: RefreshCcw,
  search: SearchIcon,
  squareArrowRight: SquareArrowRight,
  star: Star,
  sun: Sun,
  sparkles: Sparkles,
  terminal: Terminal,
  thermometer: Thermometer,
  thumbsDown: ThumbsDown,
  thumbsUp: ThumbsUp,
  trash: Trash,
  twitter: Twitter,
  undo: Undo,
  wholeWord: WholeWord,
  rollText: ScrollTextIcon,
  notEqual: EqualNotIcon,
  settings: SettingsIcon,
  paperclip: Paperclip,
  letterText: LetterText,
  image: Image,
  imageUp: ImageUp,
  logs: Logs,
  close: XIcon,
  arrowUp: ArrowUpIcon,
  arrowDown: ArrowDownIcon,
  equalApproximately: EqualApproximatelyIcon,
  braces: Braces,
  listCheck: ListCheck,
  alertCircle: AlertCircle,
  circleArrowUp: CircleArrowUp,
  gridVertical: GridVertical,
}

export type IconName = keyof typeof Icons

export type IconProps = {
  name: IconName
  color?: TextColor
  darkColor?: DarkTextColor
  spin?: boolean
  spinSpeed?: 'normal' | 'fast'
  size?: Size
  widthClass?: string
  heightClass?: string
  className?: string
}

type Size = 'small' | 'normal' | 'large' | 'xlarge' | 'xxxlarge'

export function Icon({
  name,
  color,
  darkColor,
  spin,
  spinSpeed = 'normal',
  size = 'normal',
  className,
}: IconProps) {
  const IconClass = Icons[name]!
  return (
    <IconClass
      className={cn(
        {
          [colors.textColors[color!]]: color,
          [colors.darkTextColors[darkColor!]]: darkColor,
          'w-3 h-3': size === 'small',
          'w-4 h-4': size === 'normal',
          'w-6 h-6': size === 'large',
          'w-8 h-8': size === 'xlarge',
          'w-14 h-14': size === 'xxxlarge',
          'animate-spin': spin,
          'duration-200': spinSpeed === 'fast',
        },
        className,
      )}
    />
  )
}
