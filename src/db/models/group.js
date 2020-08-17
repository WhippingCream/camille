module.exports = (sequelize, DataTypes) => {
  const group = sequelize.define(
    'group',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      groupName: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      revisionDate: {
        type: DataTypes.DATE,
      },
      discordGuildId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {},
  );
  group.associate = (/* models */) => {
    // associations can be defined here
  };
  return group;
};
