#!/bin/sh
cat services.dot | docker run --rm -i nshine/dot > services.png