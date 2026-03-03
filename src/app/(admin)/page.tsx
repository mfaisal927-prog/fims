import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Users, Globe, CircleSlash, PercentDiamond, Banknote, Calendar, Plus, Upload, FileText, Settings, ArrowRight, User } from 'lucide-react';
import DashboardFilter from './DashboardFilter';
import DashboardSparkline from './DashboardSparkline';

export const metadata = {
  title: "Dashboard | Payroll Manager",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const monthQuery = params?.month;

  // 1. Global KPIs
  const totalMembers = await prisma.member.count();
  const totalWebsites = await prisma.website.count();
  const unassignedWebsites = await prisma.website.count({
    where: { member_id: null },
  });
  const zeroPercentWebsites = await prisma.website.count({
    where: { percentage_share: 0 },
  });

  // 2. Available Payroll Months (still fetched if we need recent runs, but we don't necessarily need it for DashboardFilter now, but keep for other uses maybe?)
  const recentRuns = await prisma.payrollRun.findMany({
    select: { month: true, id: true, status: true },
    orderBy: { month: 'desc' },
    take: 6,
  });

  // 3. Current Selected Payroll Run
  const activeMonth = monthQuery || new Date().toISOString().slice(0, 7);
  let currentRun = await prisma.payrollRun.findUnique({ where: { month: activeMonth } });

  // 4. Run stats (Remaining PKR, Total Payable, etc.)
  let totalRemainingPkr = 0;
  let recordsByMember: Record<string, { payable: number, paid: number, remaining: number, usd: number }> = {};

  if (currentRun) {
    const records = await prisma.payrollRecord.findMany({
      where: { payroll_run_id: currentRun.id }
    });

    records.forEach(r => {
      totalRemainingPkr += r.remaining_pkr;

      if (!recordsByMember[r.member_id]) {
        recordsByMember[r.member_id] = { payable: 0, paid: 0, remaining: 0, usd: 0 };
      }
      recordsByMember[r.member_id].payable += r.payable_pkr;
      recordsByMember[r.member_id].paid += r.paid_pkr;
      recordsByMember[r.member_id].remaining += r.remaining_pkr;
      recordsByMember[r.member_id].usd += r.usd_amount;
    });
  }

  // 4b. Sparkline data (Last 3 runs)
  const last3Runs = await prisma.payrollRun.findMany({
    orderBy: { month: 'desc' },
    take: 3,
    select: { id: true, month: true }
  });

  const sparklineRecords = await prisma.payrollRecord.findMany({
    where: { payroll_run_id: { in: last3Runs.map(r => r.id) } },
    select: { member_id: true, payroll_run_id: true, payable_pkr: true }
  });

  const memberSparklineData: Record<string, { month: string, payable: number }[]> = {};
  for (const record of sparklineRecords) {
    if (!memberSparklineData[record.member_id]) {
      memberSparklineData[record.member_id] = [];
    }
    const run = last3Runs.find(r => r.id === record.payroll_run_id);
    if (run) {
      memberSparklineData[record.member_id].push({
        month: run.month,
        payable: Number(record.payable_pkr)
      });
    }
  }

  // 5. Finance Stats for Current Run
  let currentFinance = null;
  let salariesPaid = 0;
  let serverCosts = 0;

  if (currentRun) {
    currentFinance = await prisma.financeRecord.findUnique({
      where: { month: currentRun.month },
      include: { expenses: true }
    });
    // We need to fetch adjustments separately or alter the query
    const runWithAdj: any = await prisma.payrollRun.findUnique({
      where: { id: currentRun.id },
      include: {
        records: true,
        adjustments: true
      } as any
    });

    if (runWithAdj) {
      let calcPaid = 0;
      const memberMap = new Map();

      for (const r of runWithAdj.records) {
        if (!memberMap.has(r.member_id)) {
          memberMap.set(r.member_id, { paid: 0 });
        }
        memberMap.get(r.member_id).paid += r.paid_pkr;
      }

      if (runWithAdj.adjustments) {
        for (const adj of runWithAdj.adjustments as any[]) {
          if (!memberMap.has(adj.member_id)) continue;
          const m = memberMap.get(adj.member_id);
          if (adj.type === 'Extra Payment') m.paid += adj.amount;
          if (adj.type === 'Manual Override') m.paid = adj.amount;
        }
      }

      for (const m of Array.from(memberMap.values())) {
        calcPaid += m.paid;
      }
      salariesPaid = calcPaid;
    }

    if (currentFinance) {
      serverCosts = currentFinance.expenses
        .filter((e: any) => ['Hosting', 'VPS', 'Domain', 'CDN'].includes(e.expense_type))
        .reduce((sum: number, e: any) => sum + e.amount, 0);
    }
  } else {
    // If no payroll run, we can still fetch finance if it exists for this month!
    currentFinance = await prisma.financeRecord.findUnique({
      where: { month: activeMonth },
      include: { expenses: true }
    });

    if (currentFinance) {
      serverCosts = currentFinance.expenses
        .filter((e: any) => ['Hosting', 'VPS', 'Domain', 'CDN'].includes(e.expense_type))
        .reduce((sum: number, e: any) => sum + e.amount, 0);
    }
  }

  const bankReceived = currentFinance?.bank_received || 0;
  const bankTax = currentFinance?.bank_tax || 0;
  const netAfterTax = currentFinance?.net_after_tax || (bankReceived - bankTax);
  const otherExpenses = currentFinance?.expenses.filter((e: any) => !['Hosting', 'VPS', 'Domain', 'CDN'].includes(e.expense_type)).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;

  const manualSalariesPaid = currentFinance?.manual_salary_paid_pkr || 0;
  const displaySalariesPaid = salariesPaid + manualSalariesPaid;

  const netBalance = netAfterTax - displaySalariesPaid - serverCosts - otherExpenses;
  const silsilaAllocation = netBalance > 0 ? netBalance * 0.33 : 0;

  // 6. Member Summaries
  const members = await prisma.member.findMany({
    include: {
      _count: { select: { websites: true } }
    },
    orderBy: { full_name: 'asc' }
  });

  const gradients = [
    'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)', // Pink
    'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', // Blue
    'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)', // Purple
    'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',   // Green
    'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)', // Orange
    'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%)', // Teal
  ];
  const colors = ['#ec4899', '#3b82f6', '#a855f7', '#22c55e', '#f97316', '#14b8a6'];

  return (
    <div style={{ paddingBottom: '3rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header & Quick Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', background: 'linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard Overview
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Welcome back! Here's what's happening today.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/members/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>
            <Plus size={16} /> New Member
          </Link>
          {/* Add CSV upload action linking to the new standalone importer if it exists, else /admin/initial-import */}
          <Link href="/initial-import" className="btn" style={{ background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
            <Upload size={16} /> Bulk Import
          </Link>
          <Link href="/payroll" className="btn" style={{ background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
            <Banknote size={16} /> Payroll
          </Link>
          <Link href="/settings" className="btn" style={{ background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {/* Finance Overview (Dashboard Integration) */}
      {(currentRun || currentFinance) && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Banknote size={24} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Finance Overview: {activeMonth}</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href={`/finance/${activeMonth}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>
                {currentFinance ? "Edit Finance" : "Setup Finance"}
              </Link>
              <Link href={`/silsila`} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>Open Silsila</Link>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bank Received</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>₨ {bankReceived.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bank Tax</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>₨ {bankTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Net After Tax</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>₨ {netAfterTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Salaries Paid</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>₨ {displaySalariesPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Server Costs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>₨ {serverCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Final Net</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>₨ {netBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem', borderLeft: '2px solid var(--primary)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Silsila (33%)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>₨ {silsilaAllocation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </div>
      )}

      {/* Global KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

        <Link href="/members" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-hover-effect" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <Users size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{totalMembers}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Total Members</div>
            </div>
          </div>
        </Link>

        <Link href="/websites" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-hover-effect" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                <Globe size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{totalWebsites}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Total Websites</div>
            </div>
          </div>
        </Link>

        <Link href="/websites?unassigned=1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-hover-effect" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden' }}>
            {unassignedWebsites > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#ef4444' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <CircleSlash size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: unassignedWebsites > 0 ? '#ef4444' : 'inherit' }}>{unassignedWebsites}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Unassigned Websites</div>
            </div>
          </div>
        </Link>

        <Link href="/websites?percentZero=1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-hover-effect" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                <PercentDiamond size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{zeroPercentWebsites}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>0% Share Websites</div>
            </div>
          </div>
        </Link>

        <Link href={currentRun ? `/payroll/${currentRun.id}` : '/payroll'} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-hover-effect" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', color: 'white', border: 'none', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Banknote size={20} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>{activeMonth}</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0', display: 'flex', gap: '0.25rem', alignItems: 'end' }}>
                {totalRemainingPkr.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem', paddingBottom: '0.4rem', opacity: 0.8 }}>PKR</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 500 }}>Remaining Payout ({activeMonth})</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Member Details Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={24} style={{ color: 'var(--primary)' }} /> Member Summaries</h2>
        <DashboardFilter runs={recentRuns} currentMonth={activeMonth} />
      </div>

      {/* Member Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {members.map((member, index) => {
          const stats = recordsByMember[member.id];
          const bgLinear = gradients[index % gradients.length];
          const iconColor = colors[index % colors.length];

          return (
            <div key={member.id} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Card Header (Colorful) */}
              <div style={{ background: bgLinear, padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                      {member.full_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: '1rem', background: member.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: member.status === 'active' ? '#16a34a' : '#ef4444' }}>
                        {member.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{member._count.websites}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Websites</span>
                  <div style={{ marginTop: '0.5rem' }}>
                    <DashboardSparkline data={memberSparklineData[member.id] || []} />
                  </div>
                </div>
              </div>

              {/* Card Body (Stats) */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentRun ? (
                  stats ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Payable (PKR)</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{stats.payable.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Remaining (PKR)</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: stats.remaining > 0 ? '#ef4444' : '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {stats.remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Total USD Build</div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--primary)' }}>${stats.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Paid (PKR)</div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#16a34a' }}>{stats.paid.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.5rem', padding: '1rem' }}>
                      No earnings this month
                    </div>
                  )
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.5rem', padding: '1rem' }}>
                    No payroll runs exist
                  </div>
                )}
              </div>

              {/* Card Footer (Actions) */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--background)', display: 'flex', gap: '0.5rem' }}>
                <Link href={`/members/${member.id}`} className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
                  View Member
                </Link>
                {currentRun && stats && (
                  <Link href={`/payroll/${currentRun.id}?memberId=${member.id}`} className="btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', background: 'white', border: '1px solid var(--border)', padding: '0.5rem' }}>
                    Payroll
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {members.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: 'var(--card)', borderRadius: '1rem', border: '1px dashed var(--border)' }}>
            <Users size={48} style={{ color: 'var(--border)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ margin: '0 0 0.5rem 0' }}>No members found</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>Start by importing or creating new members.</p>
            <Link href="/members/new" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.75rem 1.5rem' }}>Add First Member</Link>
          </div>
        )}
      </div>

    </div>
  );
}
