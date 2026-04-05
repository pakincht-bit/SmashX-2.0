const fs = require('fs');
const file = 'components/Leaderboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = `<h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
  All <span className="text-[#00FF41]">Rankings</span>`;

const injection = `{/* Recent Activity */}
  {recentSessions.length > 0 && (
    <div className="space-y-3 mb-8">
      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
        Recent <span className="text-[#00FF41]">Battles</span>
      </h3>
      <div className="space-y-2">
        {recentSessions.map(session => {
          const { day, month } = getDateParts(session.startTime);
          return (
            <div key={session.id} onClick={() => onSessionClick?.(session.id)} className="cursor-pointer bg-[#001645] shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-[#00FF41]/40 border border-transparent rounded-xl p-3 transition-all hover:bg-[#001c55] group flex items-center gap-4">
              <div className="flex flex-col items-center justify-center min-w-[40px] bg-[#000B29] rounded-lg py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shrink-0">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 leading-none mb-1">{month}</span>
                <span className="text-base font-black text-white leading-none tracking-tighter">{day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-white group-hover:text-[#00FF41] transition-colors truncate mb-1 uppercase tracking-tight">{session.title || session.location}</h4>
                <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">
                  <Clock size={10} className="mr-1 text-[#00FF41]/40"/>
                  <span>{formatTime(session.startTime)}</span>
                  <span className="mx-2 opacity-30">•</span>
                  <span className="truncate">{session.location}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5 bg-[#000B29]/30 px-2 py-1 rounded text-white border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest">{session.playerIds.length}</span>
                  <Users size={10} className="text-[#00FF41]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  ` + anchor;

content = content.replace(anchor, injection);
fs.writeFileSync(file, content);
console.log("Injected code.");
