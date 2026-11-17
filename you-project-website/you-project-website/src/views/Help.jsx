import { CalendarCheck, Flag, Info, Clock, ListChecks, Smartphone } from 'lucide-react';
import { goto } from '../lib/store.js';
import { Card } from '../components/ui.jsx';
import { STUDIO } from '../studio.js';

const Step = ({ day, items }) => (
  <div className="border-b border-line/[.06] px-5 py-4 last:border-0">
    <div className="mb-2 font-display text-[13px] tracking-sub text-primary">{day}</div>
    <ul className="space-y-1.5 text-[13.5px] text-ink">{items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-faint">•</span><span>{it}</span></li>)}</ul>
  </div>
);
const Go = ({ to, sub, children }) => <button onClick={() => goto(to, sub)} className="text-accent hover:underline">{children}</button>;

export default function Help() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="The routine" icon={CalendarCheck}>
        <Step day="EVERY DAY" items={[
          <>Open <Go to="home" sub="home">Home</Go>: <b>Today’s classes</b> shows the classes you’re coaching and who’s coming, with tags for first-timers, intro offers ending, birthdays, milestones, flags and payment issues. Use <b>Minimise</b> to fold it away.</>,
          <>New faces: tap <b>Contacted</b> or <b>Not needed</b> on <Go to="onboarding" sub="new">Onboarding → New faces</Go> and they move to <Go to="onboarding" sub="actioned">Actioned</Go>.</>,
          <>At about <b>8pm</b> an email goes out if any class had bookings but few or no check-ins. Fix those in Hapana that evening, before no-show fees go out the next morning.</>
        ]} />
        <Step day="MONDAY" items={[
          <>Work through the <Go to="geronimo" sub="red">Red Flag</Go> and <Go to="geronimo" sub="fringe">Fringe List</Go>. Tap <b>Contacted</b> as you go.</>,
          <>Check <Go to="geronimo" sub="hof">Hall of Fame</Go> and <Go to="milestones" sub="celebrate">Celebrate</Go> for milestones.</>
        ]} />
        <Step day="WEDNESDAY" items={[<>Send warm check-ins to everyone on the <Go to="geronimo" sub="orange">Orange Flag</Go> (0 visits Monday–Wednesday).</>]} />
        <Step day="FRIDAY" items={[
          <>Open <Go to="geronimo" sub="weekly">Geronimo → Weekly numbers</Go> and copy each block into the Metrics sheet.</>
        ]} />
        <Step day="ANY DAY" items={[<>Keep <Go to="members" sub="risks">To contact</Go> moving: To contact → Contacted → Back on track.</>, <>Add return dates on <Go to="members" sub="suspended">Suspended</Go> when you hear them.</>]} />
      </Card>
      <div className="space-y-5">
        <Card title="More ▾ (admins)" icon={ListChecks}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p>The pages used now and then sit under <b>More</b> at the far right of the tabs: Geronimo, Sell By Chat, Membership reports (rollovers, payment issues) and Message templates. Coaches don’t see it.</p>
            <p><Go to="templates">Message templates</Go>: spiels saved in the Templates tab. Open <b>Templates</b> from a member’s profile or a Sell By Chat card and blanks like {'{first name}'} and {'{last visit}'} fill in; <b>Copy</b> puts it on your clipboard. <b>Email</b> sends it from {STUDIO.email} with the sender’s Signature template at the end. Anyone who opted out of emails in Hapana can’t be emailed.</p>
          </div>
        </Card>
        <Card title="Sell By Chat" icon={ListChecks}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p><Go to="leads" sub="today">Sell By Chat</Go> (admins only): today’s chats against the 5-a-day target, the last 14 days, warm leads still to copy to the Warm Leads sheet, and who’s waiting for a reply.</p>
            <p><b>Log a chat</b> adds a row to the SellByChat tab in the Sheet. <b>Pipeline</b> shows every chat by stage, like GHL: tap a card to add a pathway, contact details or move it along. Pathway B plus a number or email makes them a warm lead automatically. Typing straight into the tab still works; press Refresh to see it here.</p>
          </div>
        </Card>
        <Card title="Who sees what" icon={ListChecks}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p>Set on the <b>Access</b> tab of the Sheet. <b>Admin</b>: everything, and can make changes. <b>Coach</b>: today’s classes, members, attendance, milestones, onboarding and the Team hub, but no Geronimo, Sell By Chat, templates, sales, payments or cancellations. <b>Blocked</b>: no access.</p>
            <p>Anyone with a studio Google account who isn’t on the tab gets the Coach view. The private parts are removed before the data reaches a coach’s device, not just hidden.</p>
            <p>Tick <b>Admins only</b> on a to-do to keep it between the admins.</p>
          </div>
        </Card>
        <Card title="Team hub" icon={ListChecks}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p>An optional place to see what everyone’s working on and what’s been finished (<Go to="team" sub="updates">Team → Updates</Go>). There’s nothing you need to check every day: if someone leaves something for you, you’ll get an email.</p>
            <p>Add a to-do from <Go to="team" sub="mine">Team</Go> or from a member’s profile (“Add to-do about …”).</p>
            <p><b>One-off</b> (with an optional due date), <b>Repeats</b> (weekly, fortnightly or monthly) or <b>Project</b> (grouped, with a progress bar).</p>
            <p>Give a to-do to someone else and they get an email straight away. Tap any to-do to edit or delete it; ticks show who did it and when.</p>
            <p><Go to="team" sub="calendar">Calendar</Go>: Hapana’s class timetable (this week plus 4 weeks ahead, coloured by coach) and anything the team adds: meetings, leave, events. Tap a free spot to add something; tap a name to see just their week.</p>
            <p><Go to="team" sub="shared">Team list</Go>: jobs anyone can do. Pick “Team list” under “Who’s doing it”. Anyone can tick it off, and it shows who did it. No emails are sent.</p>
            <p><b>Take it</b>: on anyone else’s to-do (or a team list one), moves it to your to-dos so nobody doubles up. It remembers who it came from. To-dos past their date or added over a week ago also show under “Waiting a while” on the Team list.</p>
          </div>
        </Card>
        <Card title="Put it on your phone" icon={Smartphone}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p><b>iPhone:</b> open the dashboard in <b>Safari</b> → Share button → <b>Add to Home Screen</b> → Add.</p>
            <p><b>Android:</b> open it in <b>Chrome</b> → ⋮ menu → <b>Install app</b> (or Add to Home screen).</p>
            <p>It opens full screen with the studio icon, like an app. Sign in once inside it.</p>
          </div>
        </Card>
        <Card title="What the flags mean" icon={Flag}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p><b className="text-red">Red Flag</b>: 0 visits from last Monday up to today (anyone who has come back this week drops off). Call or message the same day.</p>
            <p><b className="text-orange">Orange Flag</b>: 0 visits Monday to Wednesday, not in since, and nothing booked for the rest of the week (anyone who trains later in the week or has booked isn’t flagged). Warm check-in within 48 hours.</p>
            <p><b className="text-orange">Fringe List</b>: 3 or fewer visits in the last 30 days.</p>
            <p><b className="text-orange">Inactive</b> 14+ days / <b className="text-red">Lapsed</b> 30+ days without a visit, for anyone with a current membership or pack.</p>
            <p>Not flagged: people on suspension, back from a pause in the last 3 weeks, or marked as cancelled.</p>
          </div>
        </Card>
        <Card title="Where the numbers come from" icon={Clock}>
          <div className="space-y-3 p-5 text-[13.5px]">
            <p>Hapana is read every morning (classes, bookings, attendance, clients, purchases). The dashboard copies the Google Sheet each morning after that, and again when it’s opened on a copy more than 3 hours old; <b>Refresh</b> pulls it straight away.</p>
            <p>Use “Back from a pause” or “Mark as cancelled” on a person when you know sooner than Hapana does.</p>
            <p>Notes, tags, Contacted stamps and rewards are saved to the Sheet as the person who made them.</p>
            <p>Hapana sometimes shows a cancellation that wasn’t one (a plan switch, a wrong purchase, someone who joined the staff). Open the person and use <b>Not really cancelled</b> to take them out of the cancellation counts.</p>
          </div>
        </Card>
        <Card title="Who can do what" icon={Info}>
          <div className="space-y-2 p-5 text-[13.5px]">
            <p>Anyone with a studio Google account gets the Coach view. <b>Admins</b> (set on the Access tab of the Sheet) see everything and can save notes, mark people and change settings.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
