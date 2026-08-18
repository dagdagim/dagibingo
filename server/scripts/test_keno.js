const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testKenoLogic() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to database...');
  await mongoose.connect(uri);

  const User = mongoose.connection.collection('users');
  const user = await User.findOne({ email: 'admin@dagibingo.com' });
  console.log('User for test:', user ? user.email : 'None');

  const { KenoService } = require('../dist/modules/keno/keno.service');
  const service = new KenoService();

  const draw = service.generateKenoDraw();
  console.log('✅ Generated 20-Ball Draw (1–80):', draw.join(', '));
  console.log('✅ Total drawn count:', draw.length);

  const result = await service.playKeno(user._id.toString(), {
    spots: [5, 12, 23, 45, 67, 78],
    wager: 10,
  });

  console.log('✅ Keno Play Result:', {
    spots: result.spots,
    matches: result.matchedNumbers,
    matchesCount: result.matchesCount,
    multiplier: result.multiplier,
    payout: result.payout,
    isWin: result.isWin,
    availableBalance: result.balance.availableBalance,
  });

  const stats = await service.getKenoStats();
  console.log('✅ Keno Stats:', {
    totalRounds: stats.totalRounds,
    hotCount: stats.hotNumbers.length,
    coldCount: stats.coldNumbers.length,
  });

  await mongoose.disconnect();
  console.log('Done!');
}

testKenoLogic().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
