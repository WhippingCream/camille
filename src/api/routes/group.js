const { Router } = require('express');
const models = require('../../db/models');

const route = Router();
const { logger } = require('../../loaders/logger');

const groupController = require('../../controller/group');
const matchController = require('../../controller/match');
const tokenController = require('../../controller/token');
const userController = require('../../controller/user');

const redis = require('../../redis/redis');
const redisKeys = require('../../redis/redisKeys');

module.exports = (app) => {
  app.use('/group', route);

  route.post('/register', async (req, res) => {
    const groupName = req.body.groupName;
    if (!groupName)
      return res.status(501).json({ result: 'invalid group name' });

    const result = await groupController.registerGroup(groupName);
    return res.status(result.status).json({ result: result.result });
  });

  route.post('/retrieve-match', async (req, res) => {
    const groupName = req.body.groupName;
    if (!groupName)
      return res.status(501).json({ result: 'invalid group name' });

    const result = await groupController.retrieveMatches(groupName);
    return res.status(result.status).json({ result: result.result });
  });

  route.get('/ranking', async (req, res) => {
    const { groupName } = req.query;

    if (!groupName)
      return res.status(501).json({ result: 'invalid group name' });

    try {
      const tokenId = req.headers.riottokenid;
      await tokenController.validateUserGroup(tokenId, groupName);

      const rankings = await groupController.getRanking(groupName);
      return res.status(rankings.status).json({ result: rankings.result });
    } catch (e) {
      logger.error(e);
      return res.status(501);
    }
  });

  route.post('/setUserRole', async (req, res, next) => {
    const groupName = req.body.groupName;
    if (!groupName)
      return res.status(501).json({ result: 'invalid group name' });

    const targetAccountId = req.body.targetAccountId;
    if (!targetAccountId)
      return res.status(501).json({ result: 'invalid account id' });

    const role = req.body.role;
    if (role !== 'admin' && role !== 'member' && role !== 'outsider')
      return { result: 'invalid role type', status: 501 };

    try {
      const group = await models.group.findOne({ where: { groupName } });
      if (!group) return { result: 'group is not exist' };

      const tokenId = req.headers.riottokenid;
      const accountId = await tokenController.getAccountId(tokenId);
      const userInfo = await userController.getInfo(group.id, accountId);
      // TODO : admin 체크

      const result = await groupController.setUserRole(
        groupName,
        targetAccountId,
        role,
      );
      return res.status(result.status).json({});
    } catch (e) {
      logger.error(e);
      return res.status(500);
    }
  });

  route.post('/refresh-rating', async (req, res) => {
    const groupName = req.body.groupName;
    if (!groupName)
      return res.status(501).json({ result: 'invalid group name' });

    const redisFieldKey = groupName;
    try {
      const isRefreshing = await redis.hgetAsync(
        redisKeys.REFRESHING_GROUP_RATING,
        redisFieldKey,
      );

      if (isRefreshing) {
        return res.status(501).json({ result: 'already refreshing' });
      }

      redis.hset(redisKeys.REFRESHING_GROUP_RATING, redisFieldKey, '1');

      const retrieveResult = await groupController.retrieveMatches(groupName);
      if (retrieveResult.status !== 200)
        return res.status(501).json({ result: 'retrieve match failed' });

      const calculateResult = await matchController.calculateRating(groupName);
      if (calculateResult.status !== 200)
        return res.status(501).json({ result: 'calculate match failed' });

      return res.json({ result: calculateResult.result });
    } catch (e) {
      logger.error(e);
    } finally {
      redis.hdel(redisKeys.REFRESHING_GROUP_RATING, redisFieldKey);
    }
  });
};
