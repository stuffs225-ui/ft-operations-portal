import { Link } from 'react-router-dom';
import { Check, AlertTriangle, Clock, Circle } from 'lucide-react';
import { currentStageIndex, type ProjectStage, type StageTone } from '../../lib/projectSpine';

const TONE: Record<StageTone, { dot: string; text: string; ring: string }> = {
  ok:      { dot: 'bg-green-500 text-white',  text: 'text-green-700',  ring: 'ring-green-200' },
  partial: { dot: 'bg-amber-500 text-white',  text: 'text-amber-700',  ring: 'ring-amber-200' },
  blocked: { dot: 'bg-red-500 text-white',    text: 'text-red-700',    ring: 'ring-red-200' },
  idle:    { dot: 'bg-gray-300 text-white',   text: 'text-gray-500',   ring: 'ring-gray-200' },
};

function StageIcon({ stage }: { stage: ProjectStage }) {
  if (stage.done) return <Check size={13} />;
  if (stage.tone === 'blocked') return <AlertTriangle size={12} />;
  if (stage.tone === 'partial') return <Clock size={12} />;
  return <Circle size={9} />;
}

// The project's factory journey as one sequential spine: WO → Chassis → Engineering
// → Materials → Production → QC. Each stage is computed from real data and links to
// where you act on it.
export function ProjectSpine({ stages }: { stages: ProjectStage[] }) {
  const current = currentStageIndex(stages);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Production Journey</h3>
        <span className="text-xs text-gray-500">
          {current >= stages.length ? 'All stages complete' : `Current: ${stages[current].label}`}
        </span>
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto">
        {stages.map((s, i) => {
          const tone = TONE[s.tone];
          const isCurrent = i === current;
          const inner = (
            <div className={`flex-1 min-w-[120px] rounded-lg border px-3 py-2 transition-colors ${
              isCurrent ? `border-transparent ring-2 ${tone.ring} bg-gray-50` : 'border-gray-100 hover:bg-gray-50'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${tone.dot}`}><StageIcon stage={s} /></span>
                <span className="text-xs font-semibold text-gray-800">{s.label}</span>
              </div>
              <div className={`text-[11px] mt-1 ${tone.text}`}>{s.detail}</div>
            </div>
          );
          return (
            <div key={s.key} className="flex items-center flex-1">
              {s.href ? <Link to={s.href} className="flex-1">{inner}</Link> : <div className="flex-1">{inner}</div>}
              {i < stages.length - 1 && <div className="w-3 h-px bg-gray-200 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
