'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('User', 'firstname', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('User', 'lastname', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addConstraint('User', {
      fields: ['username'],
      type: 'unique',
      name: 'unique_username_constraint'
    });
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn('User', 'firstname');
    await queryInterface.removeColumn('User', 'lastname');

    await queryInterface.removeConstraint('User', 'unique_username_constraint');
  }
};
