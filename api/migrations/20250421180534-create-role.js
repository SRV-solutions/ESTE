'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Role', 'description', {
      type: Sequelize.STRING,
      allowNull: true,  // Puede ser nulo si no es obligatorio
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Role', 'description');
  }
};
