const { Router } = require('express');
const { logger } = require('../../loaders/logger');
const { registerUser } = require('../../services/user');
const { getLoginCookies } = require('@whipping-cream/thresh');
const route = Router();
const userController = require('../../controller/user');
const tokenController = require('../../controller/token');
const groupController = require('../../controller/group');
const summonerController = require('../../controller/summoner');

const redis = require('../../redis/redis');
const redisKeys = require('../../redis/redisKeys');

const jwtDecode = require('jwt-decode');

module.exports = (app) => {
  app.use('/user', route);

  route.post('/register', async (req, res) => {
    const { groupName, summonerName, tokenId } = req.body;
    let { tier } = req.body;

    var ret = await registerUser(groupName, summonerName, tier, tokenId);
    return res.status(ret.status).json({ result: ret.result });
  });

  route.post('/login', async (req, res, next) => {
    const { id, password } = req.body;
    try {
      const loginCookies = await getLoginCookies(id, password);
      if (!loginCookies)
        return res.status(520).json({ result: 'selenium erorr!' });

      const jwtDecoded = jwtDecode(loginCookies['__Secure-id_token']);
      const name = jwtDecoded.acct.game_name;
      const accountId = jwtDecoded.lol[0].uid;
      const token = loginCookies['__Secure-id_token'];
      const loginResult = await userController.login(name, accountId, token);
      const groupList = await userController.getGroupList(accountId);
      return res
        .status(loginResult.status)
        .json({ loginResult: loginResult.result, groupList: groupList.result });
    } catch (e) {
      logger.error(e);
      return res.status(500);
    }
  });

  route.get('/getGroupList', async (req, res, next) => {
    try {
      const tokenId = req.headers.riottokenid;
      const accountId = await tokenController.getAccountId(tokenId);
      const groupList = await userController.getGroupList(accountId);
      return res.status(groupList.status).json({ result: groupList.result });
    } catch (e) {
      logger.error(e);
      return res.status(500);
    }
  });

  route.get('/getInfo', async (req, res, next) => {
    const { groupId } = req.query;
    try {
      const tokenId = req.headers.riottokenid;
      const accountId = await tokenController.getAccountId(tokenId);
      const userInfo = await userController.getInfo(groupId, accountId);
      return res.status(userInfo.status).json({ result: userInfo.result });
    } catch (e) {
      logger.error(e);
      return res.status(500);
    }
  });

  route.get('/getRating', async (req, res, next) => {
    const { groupName, userName } = req.query;
    try {
      const group = await groupController.getByName(groupName);
      const summoner = await summonerController.getSummonerByName(userName);
      const userInfo = await userController.getRating(
        group.id,
        summoner.result.riotId,
      );
      return res.status(userInfo.status).json({ result: userInfo.result });
    } catch (e) {
      logger.error(e);
      return res.status(500);
    }
  });

  route.post('/calculateChampionScore', async (req, res, next) => {
    const { groupId } = req.body;
    try {
      const tokenId = req.headers.riottokenid;
      const accountId = await tokenController.getAccountId(tokenId);
      const redisFieldKey = `${groupId}:${accountId}`;
      const isRefreshing = await redis.hgetAsync(
        redisKeys.REFRESHING_CHAMPION_SCORES,
        redisFieldKey,
      );

      if (isRefreshing) {
        return res.status(501).json({ result: 'already refreshing' });
      }

      redis.hset(redisKeys.REFRESHING_CHAMPION_SCORES, redisFieldKey, '1');

      const championScore = await userController.calculateChampionScore(
        groupId,
        accountId,
        tokenId,
      );

      redis.hdel(redisKeys.REFRESHING_CHAMPION_SCORES, redisFieldKey);

      return res.status(championScore.status).json(championScore.result);
    } catch (e) {
      logger.error(e);
      return res.status(500);
    }
  });
};
