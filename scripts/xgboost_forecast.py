import sys
import json
import numpy as np
import datetime

# Attempt to load XGBoost and Scikit-Learn libraries
try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from sklearn.ensemble import GradientBoostingRegressor
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

# Recipe mapping: Menu items to Inventory ingredients
RECIPES = {
    'Paneer Tikka Multani': {
        'Paneer Blocks (kg)': 1.0,
        'Fresh Cream (L)': 0.2,
        'Garam Masala (kg)': 0.05
    },
    'Butter Chicken Masala': {
        'Chicken Breast (kg)': 1.0,
        'Fresh Cream (L)': 0.5,
        'Garam Masala (kg)': 0.1,
        'Basmati Rice (kg)': 0.5
    },
    'Dal Makhani Bukhara': {
        'Black Lentils (kg)': 1.0,
        'Fresh Cream (L)': 0.3,
        'Garam Masala (kg)': 0.05,
        'Basmati Rice (kg)': 0.2
    },
    'Kashmiri Mutton Rogan Josh': {
        'Mutton Mince (kg)': 1.0,
        'Garam Masala (kg)': 0.1,
        'Basmati Rice (kg)': 0.5
    },
    'Galouti Kebab': {
        'Mutton Mince (kg)': 0.5,
        'Garam Masala (kg)': 0.05
    },
    'Garlic Butter Naan': {
        'Naan Flour (kg)': 1.0
    },
    'Peshawari Naan': {
        'Naan Flour (kg)': 1.0
    },
    'Mango Lassi': {
        'Mango Pulp (L)': 1.0,
        'Fresh Cream (L)': 0.2
    }
}

def load_input_data():
    try:
        input_data = json.loads(sys.stdin.read())
        return input_data
    except Exception as e:
        # Generate dummy input if none is passed
        return {
            'orders': [],
            'inventory': [
                {'itemName': 'Paneer Blocks (kg)', 'quantity': 25, 'minThresholdWarning': 8},
                {'itemName': 'Chicken Breast (kg)', 'quantity': 30, 'minThresholdWarning': 10},
                {'itemName': 'Black Lentils (kg)', 'quantity': 40, 'minThresholdWarning': 12},
                {'itemName': 'Mutton Mince (kg)', 'quantity': 18, 'minThresholdWarning': 6},
                {'itemName': 'Basmati Rice (kg)', 'quantity': 50, 'minThresholdWarning': 15},
                {'itemName': 'Naan Flour (kg)', 'quantity': 60, 'minThresholdWarning': 15},
                {'itemName': 'Mango Pulp (L)', 'quantity': 15, 'minThresholdWarning': 5},
                {'itemName': 'Garam Masala (kg)', 'quantity': 8, 'minThresholdWarning': 3},
                {'itemName': 'Fresh Cream (L)', 'quantity': 12, 'minThresholdWarning': 4}
            ]
        }

def train_and_forecast_item(item_name, popularity, historical_sales):
    """
    Trains a model (XGBoost or Scikit-learn fallback) for a single menu item
    and forecasts daily demand for the next 7 days.
    """
    # historical_sales is a list of daily quantities sold for the last 30 days
    X = []
    y = []
    
    # Feature engineering for history
    for i in range(7, 30):
        # Features: Day of week, weekend, 3-day rolling avg, 7-day rolling avg, popularity
        dow = i % 7
        is_weekend = 1 if dow in [5, 6] else 0
        avg_3d = float(np.mean(historical_sales[i-3:i]))
        avg_7d = float(np.mean(historical_sales[i-7:i]))
        X.append([dow, is_weekend, avg_3d, avg_7d, popularity])
        y.append(historical_sales[i])
        
    X = np.array(X)
    y = np.array(y)
    
    # Next 7 days feature preparation
    next_X = []
    current_sales_window = list(historical_sales)
    
    for day in range(7):
        dow = (30 + day) % 7
        is_weekend = 1 if dow in [5, 6] else 0
        avg_3d = float(np.mean(current_sales_window[-3:]))
        avg_7d = float(np.mean(current_sales_window[-7:]))
        next_X.append([dow, is_weekend, avg_3d, avg_7d, popularity])
        
    next_X = np.array(next_X)
    
    # Model selection & fitting
    forecast = []
    use_xgb = HAS_XGB
    use_sklearn = HAS_SKLEARN
    
    if use_xgb:
        try:
            model = xgb.XGBRegressor(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.1,
                random_state=42
            )
            model.fit(X, y)
            predictions = model.predict(next_X)
            forecast = [max(0.0, float(p)) for p in predictions]
        except Exception:
            use_xgb = False  # Trigger fallback
            
    if not use_xgb and use_sklearn:
        try:
            model = GradientBoostingRegressor(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.1,
                random_state=42
            )
            model.fit(X, y)
            predictions = model.predict(next_X)
            forecast = [max(0.0, float(p)) for p in predictions]
        except Exception:
            use_sklearn = False
            
    if not use_xgb and not use_sklearn:
        # Simple rolling average / heuristic regression fallback
        base_demand = np.mean(historical_sales[-7:])
        forecast = []
        for day in range(7):
            dow = (30 + day) % 7
            factor = 1.3 if dow in [5, 6] else 0.85
            forecast.append(max(0.0, float(base_demand * factor)))
            
    return [round(f, 2) for f in forecast]

def main():
    # If called with --test, perform a check and exit
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        print("XGBoost Engine diagnostics:")
        print(f"XGBoost installed: {HAS_XGB}")
        print(f"Scikit-Learn installed: {HAS_SKLEARN}")
        sys.exit(0)

    data = load_input_data()
    orders = data.get('orders', [])
    inventory = data.get('inventory', [])
    
    # Top items we are modeling
    target_menu_items = [
        ('Paneer Tikka Multani', 9.3, 8),
        ('Butter Chicken Masala', 9.9, 14),
        ('Dal Makhani Bukhara', 9.5, 10),
        ('Kashmiri Mutton Rogan Josh', 9.7, 7),
        ('Galouti Kebab', 9.6, 6),
        ('Garlic Butter Naan', 9.8, 15),
        ('Peshawari Naan', 8.9, 5),
        ('Mango Lassi', 9.4, 12)
    ]
    
    forecasts = {}
    
    for item_name, popularity, base_sales in target_menu_items:
        # Create a synthetic 30-day time series around the base sales rate + day-of-week factor
        np.random.seed(42 + hash(item_name) % 100)
        daily_history = []
        for d in range(30):
            dow = d % 7
            dow_factor = 1.4 if dow in [5, 6] else 0.9
            noise = np.random.uniform(-1.5, 1.5)
            daily_history.append(max(1.0, float(base_sales * dow_factor + noise)))
            
        # Overwrite last few days with real DB orders if matches are found
        # (This combines database evidence with our model!)
        for order in orders:
            try:
                # Calculate age of order in days
                created = datetime.datetime.fromisoformat(order['createdAt'].replace('Z', '+00:00'))
                age = (datetime.datetime.now(datetime.timezone.utc) - created).days
                if 0 <= age < 30:
                    items = order.get('items', [])
                    if isinstance(items, str):
                        items = json.loads(items)
                    for ordered_item in items:
                        if ordered_item.get('name') == item_name:
                            # Add real count to synthetic history
                            daily_history[29 - age] += ordered_item.get('quantity', 0)
            except Exception:
                pass
                
        forecasts[item_name] = train_and_forecast_item(item_name, popularity, daily_history)
        
    # Calculate expected daily consumption of raw ingredients for the next 7 days
    consumption_projections = {}
    for inv in inventory:
        consumption_projections[inv['itemName']] = [0.0] * 7
        
    for item_name, forecast in forecasts.items():
        if item_name in RECIPES:
            recipe = RECIPES[item_name]
            for ingredient, amount in recipe.items():
                if ingredient in consumption_projections:
                    for day in range(7):
                        consumption_projections[ingredient][day] += forecast[day] * amount

    # Estimate depletion details per inventory item
    predictions = []
    for inv in inventory:
        item_name = inv['itemName']
        qty = inv['quantity']
        min_threshold = inv['minThresholdWarning']
        
        # Expected total consumption over the next 7 days
        projected_consumption = consumption_projections.get(item_name, [0.0]*7)
        total_consumed = sum(projected_consumption)
        avg_daily = round(total_consumed / 7.0, 2)
        
        if avg_daily > 0:
            depletion_days = round(qty / avg_daily, 1)
        else:
            depletion_days = 99.0
            
        # Risk level assessment
        if depletion_days <= 3.0:
            risk = "High Risk"
        elif depletion_days <= 7.0 or qty <= min_threshold:
            risk = "Medium Risk"
        else:
            risk = "Low Risk"
            
        predictions.append({
            'itemName': item_name,
            'currentQty': qty,
            'avgDailyConsumption': avg_daily,
            'predictedDepletionDays': depletion_days,
            'riskLevel': risk,
            'projected7DaysConsumption': [round(c, 2) for c in projected_consumption]
        })
        
    # Reformat demand forecast list for client rendering
    demand_output = []
    for item_name, forecast in forecasts.items():
        demand_output.append({
            'menuItemName': item_name,
            'forecast': forecast
        })
        
    # Output unified predictions payload
    result = {
        'inventoryPredictions': predictions,
        'demandForecast': demand_output,
        'modelDiagnostics': {
            'hasXGBoost': HAS_XGB,
            'hasScikitLearn': HAS_SKLEARN,
            'timestamp': datetime.datetime.now().isoformat()
        }
    }
    
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
