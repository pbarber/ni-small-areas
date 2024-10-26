# %% Load and manipulate the raw dataframe
import pandas
import geopandas
from pyproj import Transformer
import re
import os
import requests
import numpy

def download_file_if_not_exists(url, fname=None):
    if fname is None:
        fname = os.path.basename(url)
    if not os.path.isfile(fname):
        session = requests.Session()
        with session.get(url, stream=True) as stream:
            stream.raise_for_status()
            with open(fname, 'wb') as f:
                for chunk in stream.iter_content(chunk_size=8192):
                    f.write(chunk)

# %% Get Small Area statistics
# Load the Small Areas boundaries, preconverted to match geometries
sa2011 = geopandas.read_file('sa2011_epsg4326_simplified15.json')

# Get the Small Area populations for 2020
download_file_if_not_exists('https://www.nisra.gov.uk/system/files/statistics/SAPE20-SA-Totals.xlsx', 'SAPE20-SA-Totals.xlsx')
pops = pandas.read_excel('SAPE20-SA-Totals.xlsx', sheet_name='Flat')
pops = pops[(pops['Area']=='Small Areas') & (pops['Year']==2020)][['Area_Code','MYE']]

# Load SA NI Multiple Index Of Deprivation data
download_file_if_not_exists('https://www.nisra.gov.uk/sites/nisra.gov.uk/files/publications/NIMDM17_SA%20-%20for%20publication.xls', 'NIMDM17_SA%20-%20for%20publication.xls')
nimdm = pandas.read_excel('NIMDM17_SA%20-%20for%20publication.xls', sheet_name='MDM')
nimdm.columns = nimdm.columns.str.replace(re.compile('\(.+'), '', regex=True).str.replace('\n','').str.strip()

# Load SA NI Multiple Index Of Deprivation income details
nimdm_income = pandas.read_excel('NIMDM17_SA%20-%20for%20publication.xls', sheet_name='Income')
nimdm_income.columns = nimdm_income.columns.str.replace(re.compile('\(.+'), '', regex=True).str.replace('\n','').str.strip()
nimdm = nimdm.merge(nimdm_income[['SA2011','Proportion of the population living in households whose equivalised income is below 60 per cent of the NI median']], how='left', left_on='SA2011', right_on='SA2011')

# Load SA NI Multiple Index Of Deprivation employment details
nimdm_employment = pandas.read_excel('NIMDM17_SA%20-%20for%20publication.xls', sheet_name='Employment')
nimdm_employment.columns = nimdm_employment.columns.str.replace(re.compile('\(.+'), '', regex=True).str.replace('\n','').str.strip()
nimdm = nimdm.merge(nimdm_employment[['SA2011','Proportion of the working age population who are employment deprived']], how='left', left_on='SA2011', right_on='SA2011')

# Load SA NI 2011 Census religion data
download_file_if_not_exists('https://www.nisra.gov.uk/system/files/statistics/census-2011-ks211ni.xlsx', 'census-2011-ks211ni.xlsx')
census = pandas.read_excel('census-2011-ks211ni.xlsx', sheet_name='SA', skiprows=5)
census.drop(columns=['SA','All usual residents'], inplace=True)
sa_stats = nimdm.merge(census, how='left', left_on='SA2011', right_on='SA Code')

# Include area populations
sa_stats = sa_stats.merge(pops, how='left', left_on='SA2011', right_on='Area_Code')

# Add centre points of each SA
trans = Transformer.from_crs("EPSG:29902", "EPSG:4326", always_xy=True)
coords = sa2011[['SA2011','X_COORD','Y_COORD']]
coords['centre_x'],coords['centre_y'] = trans.transform(coords['X_COORD'].values, coords['Y_COORD'].values)
coords.drop(columns=['X_COORD','Y_COORD'], inplace=True)
sa_stats = sa_stats.merge(coords, how='left', left_on='SA2011', right_on='SA2011')

# Load SA NI 2011 Census long-term condition data
download_file_if_not_exists('https://www.nisra.gov.uk/system/files/statistics/census-2011-ks302ni.xlsx', 'census-2011-ks302ni.xlsx')
census = pandas.read_excel('census-2011-ks302ni.xlsx', sheet_name='SA', skiprows=5)
census.set_index('SA Code', inplace=True)
census = census.filter(regex=r'\(%\)').reset_index()
sa_stats = sa_stats.merge(census, how='left', left_on='SA2011', right_on='SA Code')
sa_stats.drop(columns=['SA Code_x', 'SA Code_y'], inplace=True)

# %%
conn = pandas.read_csv('sa-connectivity.csv', index_col=0)
SAfrom = conn[conn['Travel Minutes']==30].groupby('SA2011_from').agg(SAs_to_30=('SA2011_to', 'count'), MYE_to_30=('MYE_to', 'sum')).reset_index()
SAto = conn[conn['Travel Minutes']==30].groupby('SA2011_to').agg(SAs_from_30=('SA2011_from', 'count'), MYE_from_30=('MYE_from', 'sum')).reset_index()
conn = SAfrom.merge(SAto, how='left', left_on='SA2011_from', right_on='SA2011_to').rename(columns={'SA2011':'SA2011_from'}).rename(columns={'SA2011_from': 'SA2011'}).drop(columns=['SA2011_to'])
sa_stats = sa_stats.merge(conn, how='left', left_on='SA2011', right_on='SA2011')

# %%
sa_stats.to_json('sa-stats.json', orient='records')

# %%
sa_stats.to_csv('sa-stats.csv', index=False)

# %% Write file to be used by OSRM
buf = sa_stats.sort_values(by='SA2011')[['centre_x','centre_y']].to_csv(lineterminator=';', header=False, index=False)
with open('sa-centres.txt', 'w') as fo:
    fo.write(buf[:-1])

# %% Read back in the OSRM output and convert to a dataframe
osrm = pandas.read_json('sa-travel.json')['durations'].explode()
osrm = osrm.reset_index().rename(columns={'index' : 'from'})
osrm['to'] = osrm.groupby('from').cumcount()

# %% Write out the entire lookup for NI
osrm.to_csv('sa-travel.csv', index=False)

# %% Create a hospital specific CSV
hosps = osrm[osrm['to'].isin([1147,103,1820,2300,3739,2401,2983])]
hosps['from'] = 'N' + hosps['from'].astype(str).str.pad(8, fillchar='0')
hosps['to'] = 'N' + hosps['to'].astype(str).str.pad(8, fillchar='0')
hosps.to_csv('sa-hosps.csv', index=False)

# %%
