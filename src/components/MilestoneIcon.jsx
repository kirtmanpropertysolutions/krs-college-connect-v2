/**
 * MilestoneIcon — maps a milestone's `icon` string (set in the
 * `milestones` table seed) to a real lucide-react icon component.
 *
 * Centralized here so:
 *   - Trophy-case grid, dashboard quest cards, toast popups, and the
 *     /milestones detail sheet all render the same icon for the same
 *     milestone — no drift.
 *   - We can swap an icon globally by editing one row in this map
 *     instead of grepping the codebase.
 *   - Any milestone whose seed icon name isn't in the map falls back
 *     gracefully to a Trophy. Safer than crashing the page if a new
 *     milestone is added with an icon name we don't have yet.
 *
 * We intentionally use only icons known to be exported by the
 * lucide-react version the project has installed (v1.9). Earlier in
 * this project we hit "Instagram is not exported" and "Youtube is not
 * exported" crashes — the safe-name approach prevents that class of
 * bug from ever surfacing for milestones.
 */

import {
  Trophy,
  UserCheck,
  CheckCircle2,
  Camera,
  Link as LinkIcon,
  GraduationCap,
  Layers,
  Map as MapIcon,
  Mail,
  MessageCircle,
  Send,
  Inbox,
  ThumbsUp,
  Calendar,
  Award,
  MapPin,
  Flame,
  Video,
  Film,
  Play,
  Sparkles,
  Share2,
} from 'lucide-react'

const ICON_MAP = {
  UserCheck,
  ClipboardCheck: CheckCircle2,
  Camera,
  Link: LinkIcon,
  School: GraduationCap,
  Stack2: Layers,
  Route: MapIcon,
  Mail,
  MessageCircle,
  Send,
  Mailbox: Inbox,
  ThumbsUp,
  CalendarEvent: Calendar,
  Soccer: Award,
  MapPin,
  Trophy,
  Flame,
  Calendar,
  Video,
  Films: Film,
  PlayCircle: Play,
  Sparkles,
  Share: Share2,
}

export default function MilestoneIcon({ name, size = 18, strokeWidth = 2, className = '', ...rest }) {
  const Component = ICON_MAP[name] || Trophy
  return <Component size={size} strokeWidth={strokeWidth} className={className} {...rest} />
}
