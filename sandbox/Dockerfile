FROM node:22-bookworm-slim

RUN groupadd --gid 10001 aether \
  && useradd --uid 10001 --gid 10001 --create-home --shell /bin/bash aether

WORKDIR /workspace
USER aether
ENV HOME=/tmp \
    npm_config_cache=/tmp/npm-cache \
    PATH=/workspace/node_modules/.bin:/usr/local/bin:/usr/bin:/bin

CMD ["sleep", "infinity"]
