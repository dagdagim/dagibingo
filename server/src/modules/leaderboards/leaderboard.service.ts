import { User } from '../../models/User';

export class LeaderboardService {
  public async getLeaderboard(category = 'MOST_WINS', _period = 'ALL_TIME') {
    let sortField = 'stats.gamesWon';
    if (category === 'HIGHEST_PRIZE') {
      sortField = 'stats.highestWin';
    } else if (category === 'MOST_GAMES') {
      sortField = 'stats.gamesPlayed';
    } else if (category === 'BEST_WIN_RATE') {
      sortField = 'stats.winRate';
    }

    const users = await User.find({ isActive: true })
      .select('username avatarUrl stats createdAt')
      .sort({ [sortField]: -1 })
      .limit(50);

    return users.map((u, index) => ({
      rank: index + 1,
      userId: u._id.toString(),
      username: u.username,
      avatarUrl: u.avatarUrl,
      gamesPlayed: u.stats?.gamesPlayed || 0,
      gamesWon: u.stats?.gamesWon || 0,
      winRate: u.stats?.winRate || 0,
      totalWinnings: u.stats?.totalWinnings || 0,
      highestWin: u.stats?.highestWin || 0,
      bestStreak: u.stats?.bestStreak || 0,
    }));
  }
}
