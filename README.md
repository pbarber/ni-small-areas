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
