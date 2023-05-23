# Express MongoDB Health Check POC

This repository contains a Proof of Concept (POC) project demonstrating the usage of Express, MongoDB, and the HealthCheckModule library for implementing a health check endpoint.

The project aims to showcase how to integrate the HealthCheckModule library into an Express application to monitor the health status of various integrations, including a MongoDB database.

# Prerequisites

Before running the POC, ensure that you have the following installed on your system:

* Node.js (version >= 14)
* npm (Node Package Manager)
* MongoDB (running instance)

# Getting Started

To get started, clone the repository and install the dependencies:

```bash
npm install
```
Start the Express server:

```bash
npm start
```

# Usage

Once the server is running, you can access the health check endpoint at the following URL:

```
http://localhost:3000/health
```

The endpoint will return a JSON response containing the health status of the application and its integrations:

```json
{
    "name": "my-project",
    "status": "healthy",
    "timestamp": "2021-09-27T18:00:00.000Z",
    "integrations": [
        {
            "name": "database",
            "kind": "database",
            "errors_since_last_health_check": 0,
            "status": "pass"
        },
        {
            "name": "cache",
            "kind": "cache",
            "errors_since_last_health_check": 0,
            "status": "pass",
            "optional": true
        }
    ]
}
```

# HealthCheckModule

Import the HealthCheckModule class in your Express application:
    
```javascript   
const { HealthCheckModule } = require('health-check-module');
```

Create an instance of the HealthCheckModule class:

```javascript
const healthCheckModule = new HealthCheckModule();
```

Register integrations:

```javascript
healthCheckModule.registerIntegration('mongodb', 'database')
```

Increment integration errors (if applicable):

```javascript
healthCheckModule.incrementIntegrationError('mongodb')
```

Retrieve the health check response

```javascript
const response = await healthCheckModule.getResponse();
console.log(response);
```

# Acknowledgments

This POC project is inspired by the need for monitoring the health of integrations in modern web applications. The HealthCheckModule library provides a simple and flexible solution for implementing health checks in Express applications.

