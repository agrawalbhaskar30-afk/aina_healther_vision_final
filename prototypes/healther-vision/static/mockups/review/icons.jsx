// Lucide-style icons rendered inline. 1.5px stroke, currentColor.
// Centralized so the whole app stays consistent.

const Icon = ({ d, size = 16, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const IArrowLeft   = (p) => <Icon {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></Icon>;
const ISun         = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>;
const IMoon        = (p) => <Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Icon>;
const IPlay        = (p) => <Icon {...p}><path d="m6 4 14 8-14 8z" fill="currentColor"/></Icon>;
const IPause       = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></Icon>;
const ISkipBack    = (p) => <Icon {...p}><path d="M19 20 9 12l10-8z" fill="currentColor"/><path d="M5 19V5"/></Icon>;
const ISkipFwd     = (p) => <Icon {...p}><path d="m5 4 10 8-10 8z" fill="currentColor"/><path d="M19 5v14"/></Icon>;
const IDownload    = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></Icon>;
const IVideo       = (p) => <Icon {...p}><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/></Icon>;
const IImage       = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L9 21"/></Icon>;
const IActivity    = (p) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>;
const ITerminal    = (p) => <Icon {...p}><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></Icon>;
const ICheck       = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>;
const IX           = (p) => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>;
const IHelpCircle  = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></Icon>;
const IChevronsUp  = (p) => <Icon {...p}><path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/></Icon>;
const IFilePlus    = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></Icon>;
const IEye         = (p) => <Icon {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>;
const ISave        = (p) => <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></Icon>;
const ITrendDown   = (p) => <Icon {...p}><path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></Icon>;
const ICamera      = (p) => <Icon {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></Icon>;
const IUserMinus   = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/></Icon>;
const IClock       = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>;
const IInfo        = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></Icon>;
const ICheckCircle = (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></Icon>;
const IAlertOctagon= (p) => <Icon {...p}><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4"/><path d="M12 16h.01"/></Icon>;
const IAlertTri    = (p) => <Icon {...p}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>;
const IPaperclip   = (p) => <Icon {...p}><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Icon>;
const ICopy        = (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Icon>;
const IChevronRight= (p) => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>;
const IExpand      = (p) => <Icon {...p}><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></Icon>;

Object.assign(window, {
  Icon,
  IArrowLeft, ISun, IMoon, IPlay, IPause, ISkipBack, ISkipFwd, IDownload,
  IVideo, IImage, IActivity, ITerminal,
  ICheck, IX, IHelpCircle, IChevronsUp, IFilePlus, IEye, ISave,
  ITrendDown, ICamera, IUserMinus, IClock, IInfo, ICheckCircle,
  IAlertOctagon, IAlertTri, IPaperclip, ICopy, IChevronRight, IExpand,
});
