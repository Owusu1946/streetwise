#!/usr/bin/env python3
"""
Import Paris street lighting data into Supabase
Download CSV: https://opendata.paris.fr/explore/dataset/eclairage-public/
"""

import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables (adapt path if needed)
load_dotenv(dotenv_path="../.env.local")

# Supabase credentials
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def import_lighting_data(csv_path: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing Supabase credentials. Check your .env.local file.")
        print("SUPABASE_URL:", SUPABASE_URL)
        print("SUPABASE_KEY:", bool(SUPABASE_KEY))
        return

    # Initialize client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Reading CSV...")
    df = pd.read_csv(csv_path, sep=';')

    print("Preparing data...")
    records = []

    for _, row in df.iterrows():

        # Extract latitude / longitude
        if 'geo_point_2d' not in row or pd.isna(row['geo_point_2d']):
            continue

        try:
            coords = row['geo_point_2d'].split(',')
            lat = float(coords[0].strip())
            lng = float(coords[1].strip())
        except:
            continue

        record = {
            'numero_ouvrage': row.get("Numéro d'ouvrage"),
            'numero_lampe': row.get("Numéro de lampe"),
            'latitude': lat,
            'longitude': lng,
            'geometry': f'POINT({lng} {lat})',
            'arrondissement': row.get('Arrondissement'),
            'secteur': row.get('Secteur'),
            'categorie_ouvrage': row.get("Catégorie de l'ouvrage"),
            'regime_horaire': row.get('Régime (horaires)'),
            'categorie_voie': row.get('Catégorie de voie'),
            'type_lampe': row.get('Type de lampe'),
            'famille_luminaire': row.get('Famille de luminaire'),
            'puissance_nominale': row.get('Puissance nominale')
        }

        # Clean invalid float values
        for k, v in record.items():
            if isinstance(v, float):
                if pd.isna(v) or v == float('inf') or v == float('-inf'):
                    record[k] = None

        records.append(record)

    print(f"Prepared {len(records)} records.")
    print("Inserting into Supabase...")

    batch_size = 1000

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]

        try:
            supabase.table('street_lights').insert(batch).execute()
            print(f"Inserted batch {i//batch_size + 1}")
        except Exception as e:
            print("❌ Error inserting batch:", e)
            print("Example record causing error:")
            print(batch[0])
            break

    print("✅ Import complete!")

if __name__ == "__main__":
    csv_path = "eclairage-public.csv"

    if not os.path.exists(csv_path):
        print("Please download the CSV from:")
        print("https://opendata.paris.fr/explore/dataset/eclairage-public/export/")
        print(f"Save it as: {csv_path}")
    else:
        import_lighting_data(csv_path)
