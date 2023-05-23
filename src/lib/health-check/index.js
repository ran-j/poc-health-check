// interface HealthCheckModule {
//     determineStatus(): Status;
//     getResponse(): HealthCheckResponse;
//     checkIntegrations(): Promise<Integration[]>;
//     registerIntegration(name: string, kind: string, optional?: boolean): void;
//     incrementIntegrationError(name: string): void;
//     resetAllIntegrationErrors(): void;
// }


module.exports = /**
* Represents a module for performing health checks on integrations.
*/
    class HealthCheckModule {
        /**
         * Constructs a new instance of the HealthCheckModule class.
         */
        constructor() {
            /**
             * A map of integrations with their respective information.
             * @type {Map<string, object>}
             */
            this.integrationsMap = new Map();
        }

        /**
         * Registers a new integration with the specified name, kind, config, and optional flag.
         * @param {string} name - The name of the integration.
         * @param {string} kind - The kind of the integration.
         * @param {object} [config={}] - The configuration object for the integration.
         * @param {boolean} [optional=false] - Optional flag indicating if the integration is optional.
         */
        registerIntegration(name, kind, config = {}, optional = false) {
            config = { ...this._getDefaultConfig(), ...config };
            this.integrationsMap.set(name, {
                kind,
                optional,
                errors: [],
                status: 'pass',
                config,
                name,
            });
        }

        /**
         * Increments the error count for the specified integration.
         * @param {string} name - The name of the integration.
         */
        incrementIntegrationError(name) {
            const integration = this.integrationsMap.get(name);
            if (integration) {
                integration.errors.push({
                    timestamp: Date.now(),
                });
            }
        }

        /**
         * Sets the status of the specified integration.
         * @param {string} name - The name of the integration.
         * @param {string} status - The status to be set for the integration ('pass', 'fail', or 'warn').
         */
        setIntegrationStatus(name, status) {
            const integration = this.integrationsMap.get(name);
            if (integration) {
                integration.status = status;
            }
        }

        /**
         * Retrieves the health check response containing the status and information of integrations.
         * @returns {Promise<object>} A promise that resolves to the health check response.
         */
        async getResponse() {
            return {
                status: await this._determineStatus(),
                integrations: Array.from(this.integrationsMap.values()).map((integration) => {
                    return {
                        ...integration,
                        config: undefined,
                        errors_length: integration.errors.length,
                        errors: undefined,
                    };
                }),
            };
        }

        /**
         * Determines the overall status of the health check.
         * @returns {Promise<string>} A promise that resolves to the overall status ('healthy', 'unhealthy', or 'down').
         * @private
         */
        async _determineStatus() {
            await this._checkIntegrations();

            const integrationArray = Array.from(this.integrationsMap.values());

            if (integrationArray.some((integration) => integration.status === 'fail' && !integration.optional)) {
                return 'down';
            }

            if (integrationArray.some((integration) => integration.status === 'warn' && !integration.optional)) {
                return 'unhealthy';
            }

            return 'healthy';
        }

        /**
         * Checks all registered integrations.
         * @returns {Promise<void>} A promise that resolves when all integrations are checked.
         * @private
         */
        _checkIntegrations() {
            const promises = [];
            for (const integration of this.integrationsMap.values()) {
                promises.push(this._checkIntegration(integration));
            }
            return Promise.all(promises);
        }

        /**
         * Resets the error count for all integrations.
         */
        resetAllIntegrationErrors() {
            for (const integration of this.integrationsMap.values()) {
                integration.errors = [];
            }
        }

        /**
         * Checks the specified integration for errors and updates its status.
         * @param {object} integration - The integration object to be checked.
         * @returns {Promise<void>} A promise that resolves when the integration is checked.
         * @private
         */
        _checkIntegration(integration) {
            return new Promise((resolve) => {
                const { errorPerIntervalToFailState, errorPerIntervalToWarnState, errorMinuteInterval } = integration.config;

                this.setIntegrationStatus(integration.name, 'pass');

                if (integration.errors.length === 0) {
                    return resolve();
                }

                const now = Date.now();
                const fiveMinutesAgo = now - errorMinuteInterval * 60000;
                const errorCount = integration.errors.reduce((acc, curr) => {
                    if (curr.timestamp > fiveMinutesAgo) {
                        acc++;
                    }
                    return acc;
                }, 0);

                if (errorPerIntervalToFailState !== -1) {
                    if (errorCount >= errorPerIntervalToFailState || (errorPerIntervalToFailState === 0 && errorCount > 0)) {
                        this.setIntegrationStatus(integration.name, 'fail');
                        return resolve();
                    }
                }

                if (errorPerIntervalToWarnState !== -1) {
                    if (errorCount >= errorPerIntervalToWarnState || (errorPerIntervalToWarnState === 0 && errorCount > 0)) {
                        this.setIntegrationStatus(integration.name, 'warn');
                        return resolve();
                    }
                }

                return resolve();
            });
        }

        /**
         * Retrieves the default configuration for integrations.
         * @returns {object} The default configuration object.
         * @private
         */
        _getDefaultConfig() {
            return {
                errorPerIntervalToFailState: 5, // 0 means any, -1 means never
                errorPerIntervalToWarnState: 0, // 0 means any, -1 means never
                errorMinuteInterval: 5,
            };
        }
    }
