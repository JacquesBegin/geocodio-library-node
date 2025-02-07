"use strict";

const axios = require("axios");

class Geocodio {
  constructor(apiKey, hostname, apiVersion) {
    this.apiKey = apiKey || process.env.GEOCODIO_API_KEY || null;
    this.hostname =
      hostname || process.env.GEOCODIO_HOSTNAME || "api.geocod.io";
    this.apiVersion = apiVersion || process.env.GEOCODIO_API_VERSION || "v1.4";

    this.SINGLE_TIMEOUT_MS = 5000;
    this.BATCH_TIMEOUT_MS = 30 * 60 * 1000;

    this.HTTP_HEADERS = {
      "User-Agent": "geocodio-library-node/1.0.1"
    };

    this.ADDRESS_COMPONENT_PARAMETERS = [
      "street",
      "city",
      "state",
      "postal_code",
      "country"
    ];
  }

  geocode(query, fields = [], limit = null) {
    return this.handleRequest("geocode", query, fields, limit);
  }

  reverse(query, fields = [], limit = null) {
    return this.handleRequest("reverse", query, fields, limit);
  }

  handleRequest(endpoint, query, fields = [], limit = null) {
    const url = this.formatUrl(endpoint);

    let queryParameters = {
      api_key: this.apiKey,
      fields: fields.join(",")
    };

    if (limit) {
      queryParameters.limit = limit;
    }

    query = this.preprocessQuery(query, endpoint);

    let response = null;
    if (this.isSingleQuery(query)) {
      response = this.performSingleRequest(url, query, queryParameters);
    } else {
      query = query.map(item => this.preprocessQuery(item, endpoint));
      response = this.performBatchRequest(url, query, queryParameters);
    }

    return response
      .then(response => response.data)
      .catch(error => {
        if (error.response) {
          const errorMessage = error.response.data.error || "Error";
          const code = error.response.status || 0;

          const decoratedError = new Error(errorMessage);
          decoratedError.code = code;

          throw decoratedError;
        } else {
          throw error;
        }
      });
  }

  formatUrl(endpoint) {
    return `https://${this.hostname}/${this.apiVersion}/${endpoint}`;
  }

  preprocessQuery(query, endpoint) {
    // Convert lat/lon to a comma-separated string
    if (endpoint === "reverse" && Array.isArray(query) && query.length === 2) {
      const [latitude, longitude] = query;

      if (this.isNumeric(latitude) && this.isNumeric(longitude)) {
        return `${latitude},${longitude}`;
      }
    }

    return query;
  }

  isSingleQuery(query) {
    if (typeof query === "object") {
      const addressComponentKeys = Object.keys(query).filter(value =>
        this.ADDRESS_COMPONENT_PARAMETERS.includes(value)
      );

      return addressComponentKeys.length >= 1;
    }

    return true;
  }

  performSingleRequest(url, query, queryParameters) {
    if (typeof query === "object") {
      queryParameters = {
        ...queryParameters,
        ...query
      };
    } else {
      queryParameters.q = query;
    }

    return axios.get(url, {
      params: queryParameters,
      timeout: this.SINGLE_TIMEOUT_MS,
      headers: this.HTTP_HEADERS
    });
  }

  performBatchRequest(url, queries, queryParameters) {
    return axios.post(url, queries, {
      params: queryParameters,
      timeout: this.BATCH_TIMEOUT_MS,
      headers: this.HTTP_HEADERS
    });
  }

  isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
}

module.exports = Geocodio;
