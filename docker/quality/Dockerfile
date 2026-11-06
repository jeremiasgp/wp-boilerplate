FROM composer:2.11.1@sha256:5190d9b445add2fa26090108273cb1ef1e1af98175201c737b85b3c4f90fbf7c AS composer
FROM wordpress:7.1.4-php8.3-apache@sha256:6888208af0e3cb93af427c13a434273b07ba353ce9e2d5a29abe3031bb28ea3a

# Development-only tooling; the WordPress image already includes required PHP extensions.
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
WORKDIR /workspace
ENTRYPOINT []
CMD ["php", "--version"]
