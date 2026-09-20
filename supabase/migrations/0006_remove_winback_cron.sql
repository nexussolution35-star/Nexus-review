-- Win-back removed from the product. Stop the scheduler.
-- Tables and functions from 0004 are left in place (harmless, unused) so no
-- data is destroyed; only the recurring job is unscheduled.
select cron.unschedule('process-due-winbacks')
where exists (select 1 from cron.job where jobname = 'process-due-winbacks');
