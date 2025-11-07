#run the hugo image:
docker run --rm -it -v $(pwd):/cmasolo -p1313:1313 hugo /bin/bash

#run hugo inside the container
hugo server --bind=0.0.0.0 --port=1313

# create a new post
hugo new --kind post <name>