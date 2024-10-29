# %% Imports and definitions
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

censusindex = {
    'KS101NI Usual Resident Population': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks101ni.xlsx',
        'skip': 4
    },
    'KS102NI Age Structure': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks102ni.xlsx',
        'skip': 5
    },
    'KS103NI Marital and Civil Partnership Status': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks103ni.xlsx',
        'skip': 4
    },
    'KS104NI Living Arrangements': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks104ni.xlsx',
        'skip': 5
    },
    'KS105NI Household Composition' : {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks105ni.xlsx',
        'skip': 5
    },
    'KS106NI All Households with: Adults not in Employment; Dependent Children; and Persons with Long-Term Health Problem or Disability': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks106ni.xlsx',
        'skip': 5
    },
    'KS107NI Lone Parent Households with Dependent Children': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks107ni.xlsx',
        'skip': 5
    },
    'KS201NI Ethnic Group': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks201ni.xlsx',
        'skip': 4
    },
    'KS202NI National Identity (Classification 1)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks202ni.xlsx',
        'skip': 4
    },
    'KS203NI National Identity (Classification 2)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks203ni.xlsx',
        'skip': 4
    },
    'KS204NI Country of Birth': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks204ni.xlsx',
        'skip': 5
    },
    'KS205NI Passports Held (Classification 1)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks205ni.xlsx',
        'skip': 5
    },
    'KS206NI Passports Held (Classification 2)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks206ni.xlsx',
        'skip': 5
    },
    'KS207NI Main Language': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks207ni.xlsx',
        'skip': 5
    },
    'KS208NI Household Language': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks208ni.xlsx',
        'skip': 4
    },
    'KS209NI Knowledge of Irish': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks209ni.xlsx',
        'skip': 5
    },
    'KS210NI Knowledge of Ulster-Scots': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks210ni.xlsx',
        'skip': 5
    },
    'KS211NI Religion': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks211ni.xlsx',
        'skip': 5
    },
    'KS212NI Religion or Religion Brought Up In': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks212ni.xlsx',
        'skip': 5
    },
    'KS301NI Health and Provision of Unpaid Care': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks301ni.xlsx',
        'skip': 5
    },
    'KS302NI Type of Long-Term Condition': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks302ni.xlsx',
        'skip': 5
    },
    'KS401NI Dwellings, Household Spaces and Accommodation Type': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks401ni.xlsx',
        'skip': 5
    },
    'KS402NI Tenure and Landlord': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks402ni.xlsx',
        'skip': 5
    },
    'KS403NI Household Size': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks403ni.xlsx',
        'skip': 4
    },
    'KS404NI Central Heating': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks404ni.xlsx',
        'skip': 4
    },
    'KS405NI Car or Van Availability': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks405ni.xlsx',
        'skip': 5
    },
    'KS406NI Adaptation to Accommodation': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks406ni.xlsx',
        'skip': 4
    },
    'KS407NI Communal Establishment Residents and Long-Term Health Problem or Disability': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks407ni.xlsx',
        'skip': 5
    },
    'KS501NI Qualifications and Students': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks501ni.xlsx',
        'skip': 5
    },
    'KS601NI Economic Activity': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks601ni.xlsx',
        'skip': 5
    },
    'KS602NI Economic Activity - Males': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks602ni.xlsx',
        'skip': 5
    },
    'KS603NI Economic Activity - Females': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks603ni.xlsx',
        'skip': 5
    },
    'KS604NI Hours Worked': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks604ni.xlsx',
        'skip': 5
    },
    'KS605NI Industry of Employment': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks605ni.xlsx',
        'skip': 5
    },
    'KS606NI Industry of Employment - Males': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks606ni.xlsx',
        'skip': 5
    },
    'KS607NI Industry of Employment - Females': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks607ni.xlsx',
        'skip': 5
    },
    'KS608NI Occupation Groups': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks608ni.xlsx',
        'skip': 5
    },
    'KS609NI Occupation Groups - Males': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks609ni.xlsx',
        'skip': 5
    },
    'KS610NI Occupation Groups - Females': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks610ni.xlsx',
        'skip': 5
    },
    'KS611NI National Statistics Socio-economic Classification (NS-SeC)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks611ni.xlsx',
        'skip': 5
    },
    'KS612NI National Statistics Socio-economic Classification (NS-SeC) - Males': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks612ni.xlsx',
        'skip': 5
    },
    'KS613NI National Statistics Socio-economic Classification (NS-SeC) - Females': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks613ni.xlsx',
        'skip': 5
    },
    'KS701NI Method of Travel to Work (Resident Population)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks701ni.xlsx',
        'skip': 5
    },
    'KS702NI Method of Travel to Work or Place of Study (Resident Population)': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks702ni.xlsx',
        'skip': 5
    },
    'KS801NI Usual Residents Born in Northern Ireland Who Have Resided Elsewhere, and Short-Term Residents': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2011-ks801ni.xlsx',
        'skip': 5
    }
}

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
nimdm.columns = nimdm.columns.str.replace(re.compile(r'\(.+'), '', regex=True).str.replace('\n','').str.strip()

# Load SA NI Multiple Index Of Deprivation income details
nimdm_income = pandas.read_excel('NIMDM17_SA%20-%20for%20publication.xls', sheet_name='Income')
nimdm_income.columns = nimdm_income.columns.str.replace(re.compile(r'\(.+'), '', regex=True).str.replace('\n','').str.strip()
nimdm = nimdm.merge(nimdm_income[['SA2011','Proportion of the population living in households whose equivalised income is below 60 per cent of the NI median']], how='left', left_on='SA2011', right_on='SA2011')

# Load SA NI Multiple Index Of Deprivation employment details
nimdm_employment = pandas.read_excel('NIMDM17_SA%20-%20for%20publication.xls', sheet_name='Employment')
nimdm_employment.columns = nimdm_employment.columns.str.replace(re.compile(r'\(.+'), '', regex=True).str.replace('\n','').str.strip()
nimdm = nimdm.merge(nimdm_employment[['SA2011','Proportion of the working age population who are employment deprived']], how='left', left_on='SA2011', right_on='SA2011')

# Include area populations
sa_stats = nimdm.merge(pops, how='left', left_on='SA2011', right_on='Area_Code')

# Add centre points of each SA
trans = Transformer.from_crs("EPSG:29902", "EPSG:4326", always_xy=True)
coords = sa2011[['SA2011','X_COORD','Y_COORD']]
coords['centre_x'],coords['centre_y'] = trans.transform(coords['X_COORD'].values, coords['Y_COORD'].values)
coords.drop(columns=['X_COORD','Y_COORD'], inplace=True)
sa_stats = sa_stats.merge(coords, how='left', left_on='SA2011', right_on='SA2011')

# Load SA NI 2011 Census data
for k, v in censusindex.items():
    download_file_if_not_exists(v.get('url'), os.path.basename(v.get('url')))
    census = pandas.read_excel(os.path.basename(v.get('url')), sheet_name='SA', skiprows=v.get('skip'))
    census.set_index('SA Code', inplace=True)
    census = census.filter(regex=r'\(%\)').reset_index()
    sa_stats = sa_stats.merge(census, how='left', left_on='SA2011', right_on='SA Code')
    sa_stats.drop(columns=['SA Code_y', 'SA Code_x', 'SA Code'], inplace=True, errors='ignore')

# Connectivity
conn = pandas.read_csv('sa-connectivity.csv', index_col=0)
SAfrom = conn[conn['Travel Minutes']==30].groupby('SA2011_from').agg(SAs_to_30=('SA2011_to', 'count'), MYE_to_30=('MYE_to', 'sum')).reset_index()
SAto = conn[conn['Travel Minutes']==30].groupby('SA2011_to').agg(SAs_from_30=('SA2011_from', 'count'), MYE_from_30=('MYE_from', 'sum')).reset_index()
conn = SAfrom.merge(SAto, how='left', left_on='SA2011_from', right_on='SA2011_to').rename(columns={'SA2011':'SA2011_from'}).rename(columns={'SA2011_from': 'SA2011'}).drop(columns=['SA2011_to'])
sa_stats = sa_stats.merge(conn, how='left', left_on='SA2011', right_on='SA2011')

# SEISA dataset
download_file_if_not_exists('https://www.hesa.ac.uk/files/SEISA-dataset.xlsx', 'SEISA-dataset.xlsx')
seisa = pandas.read_excel('SEISA-dataset.xlsx', sheet_name='SEISA dataset')
seisa = seisa[~seisa['SEISA_decile_Northern_Ireland'].isna()][['Output/Small area code','SEISA proportion','SEISA_decile_UK']]
sa_stats = sa_stats.merge(seisa, how='left', left_on='SA2011', right_on='Output/Small area code').drop(columns=['Output/Small area code'])

# %%
sa_stats.to_json('sa-stats.json', orient='records')

# %%
sa_stats.to_csv('sa-stats.csv', index=False)

# %%
import json
with open('sa-metadata.json') as fd:
    meta = json.load(fd)
meta = pandas.DataFrame.from_dict(meta['dimensions'], orient='index')
sa_stats.columns
meta.index[~meta.index.isin(sa_stats.columns)]
missing = sa_stats.columns[~sa_stats.columns.isin(meta.index)].to_list()
with open('missing.json', 'w') as fd:
    json.dump(missing, fd)

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
