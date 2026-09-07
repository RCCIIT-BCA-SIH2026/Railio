import os
import sys

def convert_xlsx():
    try:
        import pandas as pd
        print("Pandas is available. Converting via pandas...")
        
        # Paths
        schedule_xlsx = r"c:\Users\dassh\Project\railsathi\data\delays\suburban_trains_schedule_dataset.xlsx"
        schedule_csv = r"c:\Users\dassh\Project\railsathi\data\trains\suburban_trains_schedule_dataset.csv"
        
        delays_xlsx = r"c:\Users\dassh\Project\railsathi\data\trains\suburban_5yr_delays_dataset.xlsx"
        delays_csv = r"c:\Users\dassh\Project\railsathi\data\delays\suburban_5yr_delays_dataset.csv"
        
        # Convert schedules
        if os.path.exists(schedule_xlsx):
            df_sch = pd.read_excel(schedule_xlsx)
            df_sch.to_csv(schedule_csv, index=False)
            print(f"Successfully converted schedules to {schedule_csv} ({len(df_sch)} rows)")
        else:
            print(f"Error: {schedule_xlsx} not found")
            
        # Convert delays
        if os.path.exists(delays_xlsx):
            df_del = pd.read_excel(delays_xlsx)
            df_del.to_csv(delays_csv, index=False)
            print(f"Successfully converted delays to {delays_csv} ({len(df_del)} rows)")
        else:
            print(f"Error: {delays_xlsx} not found")
            
    except ImportError:
        print("Pandas is not installed. Trying to install pandas/openpyxl or fallback to manual script.")
        import subprocess
        try:
            print("Installing pandas and openpyxl...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
            import pandas as pd
            # Retry conversion
            schedule_xlsx = r"c:\Users\dassh\Project\railsathi\data\delays\suburban_trains_schedule_dataset.xlsx"
            schedule_csv = r"c:\Users\dassh\Project\railsathi\data\trains\suburban_trains_schedule_dataset.csv"
            delays_xlsx = r"c:\Users\dassh\Project\railsathi\data\trains\suburban_5yr_delays_dataset.xlsx"
            delays_csv = r"c:\Users\dassh\Project\railsathi\data\delays\suburban_5yr_delays_dataset.csv"
            
            df_sch = pd.read_excel(schedule_xlsx)
            df_sch.to_csv(schedule_csv, index=False)
            df_del = pd.read_excel(delays_xlsx)
            df_del.to_csv(delays_csv, index=False)
            print("Successfully installed dependencies and converted XLSX datasets to CSV.")
        except Exception as e:
            print(f"Failed to convert or install dependencies: {e}")

if __name__ == "__main__":
    convert_xlsx()
