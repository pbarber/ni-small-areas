# %% Imports and definitions
import pandas
import geopandas
from pyproj import Transformer
import re
import os
import requests
import io
import json
from pyjstat import pyjstat
from bs4 import BeautifulSoup
import logging

def download_file_if_not_exists(url, fname=None, jsonkey=None):
    if fname is None:
        fname = os.path.basename(url)
    if not os.path.isfile(fname):
        session = requests.Session()
        if jsonkey is None:
            with session.get(url, stream=True) as stream:
                stream.raise_for_status()
                with open(fname, 'wb') as f:
                    for chunk in stream.iter_content(chunk_size=8192):
                        f.write(chunk)
        else:
            resp = session.get(url)
            resp.raise_for_status()
            print(resp.json())
            with open(fname, 'w') as f:
                json.dump(resp.json().get(jsonkey), f)

census21index = {
    'MS-A14 Population density': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2021-ms-a14.xlsx',
        'skip': 5,
        'allcols': True
    },
    'MS-E01 Households': {
        'url': 'https://www.nisra.gov.uk/system/files/statistics/census-2021-ms-e01.xlsx',
        'skip': 5,
        'allcols': True
    }
}

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
def identify_missing(metadatafile, df):
    with open(metadatafile) as fd:
        meta = json.load(fd)
    meta = pandas.DataFrame.from_dict(meta['dimensions'], orient='index')
    missing = df.columns[~df.columns.isin(meta.index)].to_list()
    return missing

missing = identify_missing('sa-metadata.json', sa_stats)
with open('sa-missing.json', 'w') as fd:
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

# %% Load NISRA CPD
download_file_if_not_exists('https://explore.nisra.gov.uk/postcode-search/CPD_LIGHT_JULY_2024.csv')
with open('CPD_LIGHT_JULY_2024.csv', 'r') as fd:
    content = re.sub(r'NEWRY,\s+MOURNE', r'NEWRY\, MOURNE', fd.read())
    content = re.sub(r'Newry,\s+Mourne', r'Newry\, Mourne', content)
    content = re.sub(r'ARMAGH CITY,\s+BANBRIDGE', r'ARMAGH CITY\, BANBRIDGE', content)
    content = re.sub(r'Armagh City,\s+Banbridge', r'Armagh City\, Banbridge', content)
    content = re.sub(r'Armagh,\s+Banbridge', r'Armagh\, Banbridge', content)
    content = re.sub(r'Boho,Cleenish', r'Boho\,Cleenish', content)
    postcodes = pandas.read_csv(io.StringIO(content), escapechar="\\")

# %% Load the Small Areas boundaries, preconverted to match geometries
dz2021 = geopandas.read_file('dz2021_epsg4326_simplified15.geojson')
dz2021[['DZ2021_cd','LGD2014_nm','Area_ha','Perim_km']]

# Load DZ NI 2021 Census data
dz_stats = pandas.DataFrame(dz2021[['DZ2021_cd','LGD2014_nm','Area_ha','Perim_km']])
dz_stats = load_non_builder_census_data(census21index, dz_stats)

download_file_if_not_exists('https://www.nisra.gov.uk/system/files/statistics/geography-census-2021-population-weighted-centroids-for-data-zones-and-super-data-zones.xlsx', 'geography-census-2021-population-weighted-centroids-for-data-zones-and-super-data-zones.xlsx')
centroids = pandas.read_excel('geography-census-2021-population-weighted-centroids-for-data-zones-and-super-data-zones.xlsx')
trans = Transformer.from_crs("EPSG:29902", "EPSG:4326", always_xy=True)
coords = centroids[['DZ2021_code','X','Y']]
coords['centroid_x'],coords['centroid_y'] = trans.transform(coords['X'].values, coords['Y'].values)
coords.drop(columns=['X','Y'], inplace=True)
dz_stats = dz_stats.merge(coords, how='left', left_on='DZ2021_cd', right_on='DZ2021_code', suffixes=('','.y'))
dz_stats.drop(columns=['DZ2021_code'], inplace=True)

# %%
dataset = pyjstat.Dataset.read('https://ws-data.nisra.gov.uk/public/api.restful/PxStat.Data.Cube_API.ReadDataset/BSDZ/JSON-stat/1.0/en')
benefits = dataset.write('dataframe')
benefits = benefits[benefits['Year']=='2024'].drop(columns='Year').pivot(index='Data Zones', columns='Statistic', values='value').rename_axis('Geography')
dz_stats = dz_stats.merge(benefits, how='left', on='Geography')

# %% Helper functions for getting Census 2021 data
def get_stats_from_nisra_builder(url, group, values='Count', index='Census 2021 Data Zone Code', rename_index='DZ2021_cd'):
    resp = requests.get(url)
    resp.raise_for_status()
    df = pandas.read_csv(io.StringIO(resp.text))
    df = df.pivot(index=index, columns=(group + ' Label'), values=values).rename_axis(rename_index)
    return(df.add_prefix(f'{group}: ', axis='columns'))

def get_all_census_tables_for_area(area_type):
    session = requests.Session()
    base_url = 'https://build.nisra.gov.uk'
    tables = []
    for pop in ['PEOPLE', 'HOUSEHOLD']:
        resp = session.get(base_url + f'/en/custom/variables?d={pop}&v={area_type}&st=')
        resp.raise_for_status()
        html = BeautifulSoup(resp.text)
        for a in html.find_all('a', class_='choice__target', href=True):
            sub = session.get(base_url + a['href'])
            sub.raise_for_status()
            subhtml = BeautifulSoup(sub.text)
            labels = subhtml.find_all('label', class_='radio__label')
            for l in labels:
                query = '?d=' + pop + (''.join(f'&v={v}' for v in [area_type, l.get('for')]))
                tables.append(
                    {
                        'name': l.text.strip('\n'),
                        'pageurl': f'{base_url}/en/custom/data{query}',
                        'csvurl': f'{base_url}/en/custom/table.csv{query}'
                    }
                )
    return tables

def get_tables_from_census_builder(tables, df, index='Census 2021 Data Zone Code', rename_index='DZ2021_cd'):
    fields = {}
    for t in tables:
        try:
            table = get_stats_from_nisra_builder(t['csvurl'], t['name'], index=index, rename_index=rename_index)
        except Exception as e:
            logging.exception(f'Caught error accessing {t['name']}')
        else:
            df = df.merge(table, how='left', on=rename_index)
            [fields.update({c: {'URL': t['pageurl'], 'type': 'Metric'}}) for c in table.columns.to_list()]

    return fields, df

def add_descriptions_from_nisra_builder(metadatafile):
    session = requests.Session()
    with open(metadatafile) as fd:
        fields = json.load(fd)
        for k, field in fields['dimensions'].items():
            if field.get('description') is None:
                m = re.search(r'\?d\=(\w+)\&v\=(\w+)\&v\=(\w+)', field.get('URL'))
                url = f'https://build.nisra.gov.uk/en/metadata/variable?d={m.group(1)}&v={m.group(3)}'
                resp = session.get(url)
                resp.raise_for_status()
                html = BeautifulSoup(resp.text)
                fields['dimensions'][k]['description'] = html.find('div', class_='page-section-inner').text
    with open(metadatafile, 'w') as fd:
        json.dump(fields, fd, indent=4)

# Find columns that are equivalent (have the same values)
def find_equivalent_columns(df):
    equivalent_cols = []
    cols = df.columns
    for i in range(len(cols)):
        for j in range(i+1, len(cols)):
            if df[cols[i]].equals(df[cols[j]]):
                equivalent_cols.append((cols[i], cols[j]))
    return equivalent_cols

def remove_missing_metadata_entries(metadatafile, df):
    with open(metadatafile) as fd:
        fields = json.load(fd)
        missing_dimensions = [k for k, field in fields['dimensions'].items() 
                             if k not in df.columns]
        fields['dimensions'] = {k: v for k, v in fields['dimensions'].items() if k not in missing_dimensions}
    with open(metadatafile, 'w') as fd:
        json.dump(fields, fd, indent=4)

# Find columns containing 'No code required'
def find_no_code_columns(df):
    no_code_cols = [col for col in df.columns if 'No code required' in col]
    return no_code_cols

def load_non_builder_census_data(censusindex, df, sheet='DZ', index='DZ2021_cd'):
    for k, v in censusindex.items():
        download_file_if_not_exists(v.get('url'), os.path.basename(v.get('url')))
        census = pandas.read_excel(os.path.basename(v.get('url')), sheet_name=sheet, skiprows=v.get('skip'))
        if 'Geography code' in census:
            census.set_index('Geography code', inplace=True)
        else:
            census.set_index('Geography Code', inplace=True)
        census.rename_axis(index, inplace=True)
        if not v.get('allcols', False):
            census = census.filter(regex=r'\(%\)').reset_index()
        census.drop(columns=['Access census area explorer'], inplace=True, errors='ignore')
        if len(df)==0:
            df = census.reset_index()
        else:
            df = df.merge(census, how='left', left_on=index, right_on=index, suffixes=('','.y'))
        df.drop(columns=[f'{index}.y'], inplace=True, errors='ignore')
    return df

# %%
dz_tabs = get_all_census_tables_for_area('DZ21')
fields, dz_stats = get_tables_from_census_builder(dz_tabs, dz_stats, index='Census 2021 Data Zone Code', rename_index='DZ2021_cd')
add_descriptions_from_nisra_builder('dz-metadata.json')
dz_stats = dz_stats.drop(columns=find_no_code_columns(dz_stats))
dz_stats = dz_stats.drop(columns=find_equivalent_columns(dz_stats)[0].drop_duplicates())
remove_missing_metadata_entries('dz-metadata.json', dz_stats)

# %%
download_file_if_not_exists('https://www.nisra.gov.uk/system/files/statistics/census-2021-ms-e01.xlsx', 'census-2021-ms-e01.xlsx')
dzhs = pandas.read_excel('census-2021-ms-e01.xlsx', sheet_name='DZ', skiprows=5)
dzhs = dzhs[['Geography code', 'All households']]
dz_stats = dz_stats.merge(dzhs.rename(columns={'Geography code': 'DZ2021_cd'}), how='left', on='DZ2021_cd')

# %%
dz_stats.to_csv('dz-stats.csv', index=False)

# %% Load and clean data for District Electoral Areas
download_file_if_not_exists('https://www.nisra.gov.uk/system/files/statistics/2025-05/MYE23_DEA.xlsx', 'MYE23_DEA.xlsx')
dea = pandas.read_excel('MYE23_DEA.xlsx', sheet_name='Flat')
dea = dea[(dea['Year']==2023) & (dea['Sex']=='All Persons') & (dea['Age']=='All ages')][['Area_code','Area_name','LGD2014_Name','MYE']]
dea.rename(columns={'Area_code': 'DEA_cd', 'Area_name': 'DEA_nm', 'LGD2014_Name': 'LGD2014_nm', 'MYE': 'MYE2023'}, inplace=True)

dea_tabs = get_all_census_tables_for_area('DEA14')
fields, dea = get_tables_from_census_builder(dea_tabs, dea, index='District Electoral Area 2014 Code', rename_index='DEA_cd')
dea = dea.drop(columns=pandas.DataFrame(find_equivalent_columns(dea))[0].drop_duplicates())
dea = dea.drop(columns=find_no_code_columns(dea))

dea = load_non_builder_census_data(census21index, dea, sheet='DEA', index='DEA_cd')

dea.to_csv('dea-stats.csv', index=False)

# %%
with open('dea-metadata.json', 'w') as fd:
    json.dump(fields, fd, indent=4)
# Followed by manual editing to setup the file format correctly

# %%
add_descriptions_from_nisra_builder('dea-metadata.json')
remove_missing_metadata_entries('dea-metadata.json', dea)

# %%
def transfer_metadata(sourcefile, targetfile):
    with open(sourcefile) as fd:
        source = json.load(fd)
    with open(targetfile) as fd:
        target = json.load(fd)
    for k, v in source['dimensions'].items():
        if k in target['dimensions']:
            for m in ['title', 'date', 'bins', 'extremes']:
                if m not in target['dimensions'][k] and m in v:
                    target['dimensions'][k][m] = v[m]
            if v['type'] != target['dimensions'][k]['type']:
                target['dimensions'][k]['type'] = v['type']
    with open(targetfile, 'w') as fd:
        json.dump(target, fd, indent=4)
# %%
transfer_metadata('dz-metadata.json', 'dea-metadata.json')

# %%