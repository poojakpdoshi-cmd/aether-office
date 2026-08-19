import { cn } from "@/lib/utils";

type OfficeEmployee = {
  name: string;
  shortName: string;
  role: string;
  status: string;
  accent: string;
};

type Props = {
  employees: OfficeEmployee[];
  activity?: string;
  onOpenChat: () => void;
};

const desks: Record<string, { x: string; y: string; room: string }> = {
  Manus: { x: "19%", y: "25%", room: "Strategy desk" },
  Gemini: { x: "73%", y: "24%", room: "Build desk" },
  DeepSeek: { x: "82%", y: "49%", room: "Architecture desk" },
  Mistral: { x: "69%", y: "75%", room: "Implementation desk" },
  Arcee: { x: "36%", y: "76%", room: "Review desk" },
  Grok: { x: "20%", y: "56%", room: "Research nook" },
};

function locationFor(employee: OfficeEmployee) {
  if (employee.status === "IN_MEETING") return { x: "50%", y: "49%", motion: "meeting" };
  if (employee.status === "THINKING") return { ...desks[employee.name], motion: "walking" };
  if (employee.status === "CODING") return { ...desks[employee.name], motion: "working" };
  if (employee.status === "REVIEWING") return { ...desks[employee.name], motion: "reviewing" };
  if (employee.status === "TESTING") return { ...desks[employee.name], motion: "testing" };
  if (employee.status === "WAITING") return { x: "31%", y: "48%", motion: "waiting" };
  if (employee.status === "COMPLETED") return { x: "87%", y: "81%", motion: "celebrating" };
  if (employee.status === "ERROR") return { x: "50%", y: "17%", motion: "error" };
  return { ...desks[employee.name], motion: "idle" };
}

export function LiveOffice({ employees, activity, onOpenChat }: Props) {
  return (
    <section className="live-office-shell">
      <header className="live-office-head">
        <div>
          <p className="live-office-kicker">AetherOffice · live simulation</p>
          <h1>AI Company Floor</h1>
          <p>Watch the team gather, work, review, and ship—in response to real task activity.</p>
        </div>
        <button className="office-task-button" onClick={onOpenChat}>Start a team task</button>
      </header>

      <div className="office-legend">
        <span><i className="legend-dot meeting" />Meeting</span><span><i className="legend-dot working" />At desk</span><span><i className="legend-dot walking" />Moving</span><span><i className="legend-dot idle" />Available</span>
      </div>

      <div className="office-stage" aria-label="Animated isometric AI office">
        <div className="office-floor" />
        <div className="office-wall office-wall-top"><span>AETHER SOFTWARE CO.</span><span className="wall-window" /></div>
        <div className="office-wall office-wall-right"><span className="plant" /><span className="bookshelf" /></div>
        <div className="office-lounge"><span className="coffee" />Coffee & research</div>
        <div className="office-meeting-zone"><div className="meeting-table"><span>DEEP<br />DISCUSS</span></div><div className="meeting-chairs"><i /><i /><i /><i /></div></div>
        {Object.entries(desks).map(([name, desk]) => <div key={name} className="office-desk" style={{ left: desk.x, top: desk.y }}><span className="desk-monitor" /><span className="desk-lamp" /><small>{desk.room}</small></div>)}
        <div className="office-printer"><span>PRINT</span></div>
        <div className="office-door">SHIP<br />ROOM</div>

        {employees.map((employee) => {
          const spot = locationFor(employee);
          return <button key={employee.name} onClick={onOpenChat} title={`${employee.name}: ${employee.status}`} className={cn("office-agent", `agent-${spot.motion}`)} style={{ left: spot.x, top: spot.y }}>
            <span className={cn("agent-avatar", employee.accent)}>{employee.shortName}</span>
            <span className="agent-name">{employee.name}</span>
            <span className="agent-status">{employee.status}</span>
            {["working", "reviewing", "testing"].includes(spot.motion) ? <span className="typing-lines">{spot.motion === "testing" ? "✓" : spot.motion === "reviewing" ? "⌕" : "⌨"}</span> : null}
          </button>;
        })}
      </div>

      <footer className="office-live-feed"><span className="feed-pulse" />{activity || "Office is quiet. Stage a task to call the team into a meeting."}</footer>
    </section>
  );
}
