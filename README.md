# NI Small Area data explorer



If you like the app and can afford it, please [donate to Action Cancer](https://actioncancer.org/donate-to-action-cancer/) or [buy me a coffee](https://www.buymeacoffee.com/pbarber).

## Privacy

The app uses Google Analytics to measure usage.

## Datasets

The app makes use of a single dataset which is built from the following open datasets:

* [UK Travel Area Isochrones (Nov/Dec 2022) by Public Transport and Walking for Northern Ireland - Generalised to 10m](https://geoportal.statistics.gov.uk/datasets/7f1c281b2561483891cd797b0f6fd463/explore): the boundaries of the areas that can be reached using public transport from each Small Area in NI

## Examples


## Technical details

Don't read any further unless you really want to.



### App setup

To run the app, clone the github repo and open [index.html](index.html) in a web browser. The app consists of a single HTML file and uses JavaScript.

Key JavaScript libraries used are:

* 

Other libraries used are:

* Metbrewer

### Python setup

To create the map file, use the following.

Developed in Visual Studio Code using the [Remote-Containers](https://code.visualstudio.com/docs/devcontainers/containers) extension. To start the container, open `docker-compose.yml` and select `Docker: Compose Up`. Then find the `ni-small-areas_dev` container and right-click it, choose `Attach Visual Studio Code`. This will open a new window within the container. The first time you run the container you will need to install the Python extension, and choose the Python interpreter at `/usr/local/bin/python`.

To run the processing script run the following in the VS Code terminal:

```bash
python process.py --help
```

Key Python libraries used are:

* [Pandas](https://pandas.pydata.org/) - for general data manipulation
* [Requests](https://requests.readthedocs.io/en/latest/) - for getting data from URLs

### OSRM setup

The following commands [based on this walkthrough](https://gist.github.com/AlexandraKapp/e0eee2beacc93e765113aff43ec77789) allowed me to set up an OSRM Docker image using [this Ireland and NI file](http://download.geofabrik.de/europe/ireland-and-northern-ireland.html):

```bash
docker pull osrm/osrm-backend
docker run -t -v .:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/ireland-and-northern-ireland-latest.osm.pbf
docker run -t -v .:/data osrm/osrm-backend osrm-partition /data/ireland-and-northern-ireland-latest.osm
docker run -t -v .:/data osrm/osrm-backend osrm-customize /data/ireland-and-northern-ireland-latest.osm
docker run --name osrm -t -i -p 5500:5000 -v .:/data osrm/osrm-backend osrm-routed --algorithm mld --max-table-size 5000 /data/ireland-and-northern-ireland-latest.orm
```

The Python [notebook](notebook.py) outputs the centre points of the Small Areas in a OSRM-friendly format, which can then be fed in to OSRM using:

```bash
curl "http://localhost:5500/table/v1/driving/$(cat ../ni-small-areas/sa-centres.txt)" > sa-travel.json
```
