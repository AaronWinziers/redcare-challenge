# Redcare Pharmacy Coding Challenge
## Description

Service that consumes part of the GitHub API and rates the popularity of repositories.

## Project setup

```bash
$ yarn install
```

All required .env variables are validated with default values provided. All defaults are stored in `example.env`. Should any values need to be overwritten, this can be done by creating an `.env` file based off of `example.env` and replacing values as needed.  

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

Alternatively, the API can be run in a docker container:
```bash
# Build
docker build -t redcare-challenge:latest .

# Run the image 
docker run -p 127.0.0.1:3000:3000 redcare-challenge:latest
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Notes

The GitHub Api rate limits non-authenticated users at 60 requests per hour. Authentication is supposed to occur through either an [OAuth app, a GitHub App, or through use of a personal access token](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10). To avoid unsafe useage of personal access tokens, this API chooses NOT to allow for passing of access tokens in requests or for the configuration thereof.   
