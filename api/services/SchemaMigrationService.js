'use strict'

const Service = require('trails-service')

/**
 * @module SchemaMigrationService
 * @description Schema Migrations
 */
module.exports = class SchemaMigrationService extends Service {

  /**
   * Drop collection
   * @param model model object
   */
  dropModel(model) {
    return model.sequelize.query('SET FOREIGN_KEY_CHECKS = 0').then(() => {
      return model.sync({
        force: true
      })
    }).then(() => {
      return model.sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
    }).catch(err => {
      return model.sync({
        force: true
      })
    })
  }

  /**
   * Alter an existing schema
   * @param model model object
   */
  alterModel(model) {
    return model.sync()
  }

  /**
   * Drop collections in current connection
   * @param connection connection object
   */
  dropDB(connection) {
    const dialect = connection.dialect.connectionManager.dialectName
    return connection.query(dialect === 'sqlite' ? 'PRAGMA foreign_keys = OFF' : 'SET FOREIGN_KEY_CHECKS = 0').then(() => {
      return connection.sync({
        force: true
      })
    }).then(() => {
      return connection.query(dialect === 'sqlite' ? 'PRAGMA foreign_keys = ON' : 'SET FOREIGN_KEY_CHECKS = 1')
    }).catch(err => {
      return connection.sync({
        force: true
      })
    })
  }

  /**
   * Alter an existing database
   * @param connection connection object
   */
  alterDB(connection) {
    return connection.sync()
  }

  /**
   *
   */
  async installExtension(extension, connection) {
    this.app.log.debug('SchemaMigrationService.installExtension(): Installing extension: ', extension)
    const [installedExtensions, metadata] = await connection.query(`SELECT * FROM pg_extension WHERE extname = '${extension}'`, {
      raw: true
    })
    if (metadata.rowCount === 0) {
      this.app.log.debug(`SchemaMigrationService.installExtension() Missing ${extension} extension. Attempting to install`)
      try {
        const [installedExtensions, metadata] = await connection.query(`CREATE EXTENSION ${extension}`, {
          raw: true
        })
        this.app.log.error('SchemaMigrationService.installExtension() Result: ', installedExtensions)
        return true

      } catch (error) {
        this.app.log.error(`SchemaMigrationService.installExtension() Failed to install ${extension} extension: `, error)
        return false
      }
    } else {
      this.app.log.debug(`SchemaMigrationService.installExtension() ${extension} is already installed`)
      return false
    }
  }

  /**
   *
   */
  async installExtensions(extensions, connection) {
    // If no extensions are required, we skip this
    if (extensions.length === 0) {
      return []
    }

    let installedExtensions = []
    for (var i = 0; i < extensions.length; i++) {
      const extensionName = extensions[i]
      const result = await this.installExtension(extensionName, connection)
      if (result) {
        installedExtensions.push(extensionName)
      }
    }

    return installedExtensions
  }
}
