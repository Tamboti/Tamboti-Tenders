import type { ComponentProps } from "react";
import {
  ArrowLeft as IArrowLeft,
  ArrowRight as IArrowRight,
  Bell as IBell,
  Bookmark as IBookmark,
  BookmarkSolid as IBookmarkSolid,
  Building as IBuilding,
  Calendar as ICalendar,
  Check as ICheck,
  CheckCircle as ICheckCircle,
  Circle as ICircle,
  Clock as IClock,
  Cube as ICube,
  Dollar as IDollar,
  Drag as IDrag,
  EditPencil as IEditPencil,
  FilterList as IFilterList,
  Globe as IGlobe,
  GraphUp as IGraphUp,
  Label as ILabel,
  LogOut as ILogOut,
  MapPin as IMapPin,
  Menu as IMenu,
  MoreHoriz as IMoreHoriz,
  NavArrowDown as INavArrowDown,
  NavArrowLeft as INavArrowLeft,
  NavArrowRight as INavArrowRight,
  NavArrowUp as INavArrowUp,
  OpenInWindow as IOpenInWindow,
  PageSearch as IPageSearch,
  Play as IPlay,
  Plus as IPlus,
  RefreshDouble as IRefreshDouble,
  Search as ISearch,
  SidebarCollapse as ISidebarCollapse,
  Sparks as ISparks,
  Trash as ITrash,
  Xmark as IXmark,
  XmarkCircle as IXmarkCircle,
} from "iconoir-react";

type IconProps = ComponentProps<typeof ISearch>;
type IconComponent = (props: IconProps) => JSX.Element;

const withDefaultStroke = (Icon: any): IconComponent => {
  const Wrapped = ({ strokeWidth = 1.9, ...props }: IconProps) => (
    <Icon strokeWidth={strokeWidth} {...props} />
  );
  return Wrapped;
};

export const Search = withDefaultStroke(ISearch);
export const Bookmark = withDefaultStroke(IBookmark);
export const BookmarkCheck = withDefaultStroke(IBookmarkSolid);
export const BookmarkX = withDefaultStroke(IBookmark);
export const MoreHorizontal = withDefaultStroke(IMoreHoriz);
export const ChevronLeft = withDefaultStroke(INavArrowLeft);
export const ChevronRight = withDefaultStroke(INavArrowRight);
export const ChevronDown = withDefaultStroke(INavArrowDown);
export const ChevronUp = withDefaultStroke(INavArrowUp);
export const Pencil = withDefaultStroke(IEditPencil);
export const Trash2 = withDefaultStroke(ITrash);
export const TrendingUp = withDefaultStroke(IGraphUp);
export const Clock = withDefaultStroke(IClock);
export const Clock3 = withDefaultStroke(IClock);
export const Globe = withDefaultStroke(IGlobe);
export const SlidersHorizontal = withDefaultStroke(IFilterList);
export const X = withDefaultStroke(IXmark);
export const ArrowLeft = withDefaultStroke(IArrowLeft);
export const ArrowRight = withDefaultStroke(IArrowRight);
export const Loader2 = withDefaultStroke(IRefreshDouble);
export const Play = withDefaultStroke(IPlay);
export const CheckCircle2 = withDefaultStroke(ICheckCircle);
export const XCircle = withDefaultStroke(IXmarkCircle);
export const Menu = withDefaultStroke(IMenu);
export const LogOut = withDefaultStroke(ILogOut);
export const PanelLeft = withDefaultStroke(ISidebarCollapse);
export const Check = withDefaultStroke(ICheck);
export const Circle = withDefaultStroke(ICircle);
export const Dot = withDefaultStroke(ICircle);
export const Plus = withDefaultStroke(IPlus);
export const Bell = withDefaultStroke(IBell);
export const ExternalLink = withDefaultStroke(IOpenInWindow);
export const GripVertical = withDefaultStroke(IDrag);
export const FileSearch = withDefaultStroke(IPageSearch);
export const Calendar = withDefaultStroke(ICalendar);
export const MapPin = withDefaultStroke(IMapPin);
export const Building2 = withDefaultStroke(IBuilding);
export const Tag = withDefaultStroke(ILabel);
export const DollarSign = withDefaultStroke(IDollar);
export const Layers = withDefaultStroke(ICube);
export const Sparkles = withDefaultStroke(ISparks);

