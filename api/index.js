// Single Vercel Serverless Function entry point. Legacy /api/* paths are preserved via vercel.json rewrites.

import admin_analytics from '../lib/server/api-handlers/admin-analytics.js';
import admin_audit from '../lib/server/api-handlers/admin-audit.js';
import admin_auth from '../lib/server/api-handlers/admin-auth.js';
import admin_monitoring from '../lib/server/api-handlers/admin-monitoring.js';
import admin_settings from '../lib/server/api-handlers/admin-settings.js';
import admin_stats from '../lib/server/api-handlers/admin-stats.js';
import admin_users from '../lib/server/api-handlers/admin-users.js';
import analytics from '../lib/server/api-handlers/analytics.js';
import auth from '../lib/server/api-handlers/auth.js';
import challenges from '../lib/server/api-handlers/challenges.js';
import chat from '../lib/server/api-handlers/chat.js';
import config from '../lib/server/api-handlers/config.js';
import cron_analytics_cleanup from '../lib/server/api-handlers/cron-analytics-cleanup.js';
import friend_leaderboard from '../lib/server/api-handlers/friend-leaderboard.js';
import friends from '../lib/server/api-handlers/friends.js';
import health from '../lib/server/api-handlers/health.js';
import leaderboard from '../lib/server/api-handlers/leaderboard.js';
import lessons from '../lib/server/api-handlers/lessons.js';
import notion_sync from '../lib/server/api-handlers/notion-sync.js';
import privacy from '../lib/server/api-handlers/privacy.js';
import profile from '../lib/server/api-handlers/profile.js';
import progress from '../lib/server/api-handlers/progress.js';
import reports from '../lib/server/api-handlers/reports.js';
import social from '../lib/server/api-handlers/social.js';
import vocabulary from '../lib/server/api-handlers/vocabulary.js';

const handlers = {
  'admin-analytics': admin_analytics,
  'admin-audit': admin_audit,
  'admin-auth': admin_auth,
  'admin-monitoring': admin_monitoring,
  'admin-settings': admin_settings,
  'admin-stats': admin_stats,
  'admin-users': admin_users,
  'analytics': analytics,
  'auth': auth,
  'challenges': challenges,
  'chat': chat,
  'config': config,
  'cron-analytics-cleanup': cron_analytics_cleanup,
  'friend-leaderboard': friend_leaderboard,
  'friends': friends,
  'health': health,
  'leaderboard': leaderboard,
  'lessons': lessons,
  'notion-sync': notion_sync,
  'privacy': privacy,
  'profile': profile,
  'progress': progress,
  'reports': reports,
  'social': social,
  'vocabulary': vocabulary,
};

export default async function handler(req,res){
  const url = new URL(req.url || '/', 'http://localhost');
  const route = String(url.searchParams.get('route') || '').replace(/^\/+|\/+$/g,'');
  const fn = handlers[route];
  if (!fn) return res.status(404).json({ok:false,error:'API route not found'});
  return fn(req,res);
}
