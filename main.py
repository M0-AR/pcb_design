import pcbnew

def create_pcb():
    # Create a new board
    board = pcbnew.BOARD()  # Create a new board object

    # Set up the design rules
    design_settings = board.GetDesignSettings()
    design_settings.SetBoardThickness(1600000)  # 1.6mm thick PCB in nanometers

    # Add main components
    mpu = add_component(board, "MPU6050", "U1", pcbnew.wxPoint(100000000, 100000000))
    bt_module = add_component(board, "HC-05", "U2", pcbnew.wxPoint(150000000, 100000000))
    esp32 = add_component(board, "ESP32-WROOM-32", "U3", pcbnew.wxPoint(200000000, 100000000))
    
    # Add power regulation components
    regulator = add_component(board, "AMS1117-3.3", "U4", pcbnew.wxPoint(50000000, 50000000))
    c1 = add_component(board, "10uF", "C1", pcbnew.wxPoint(40000000, 60000000))  # Input capacitor
    c2 = add_component(board, "22uF", "C2", pcbnew.wxPoint(60000000, 60000000))  # Output capacitor
    
    # Add pull-up resistors for I2C
    r1 = add_component(board, "4.7k", "R1", pcbnew.wxPoint(110000000, 90000000))
    r2 = add_component(board, "4.7k", "R2", pcbnew.wxPoint(120000000, 90000000))
    
    # Add decoupling capacitors
    c3 = add_component(board, "0.1uF", "C3", pcbnew.wxPoint(105000000, 110000000))
    c4 = add_component(board, "0.1uF", "C4", pcbnew.wxPoint(155000000, 110000000))
    c5 = add_component(board, "0.1uF", "C5", pcbnew.wxPoint(205000000, 110000000))
    
    # Power connections
    add_track(board, regulator, "VOUT", esp32, "3V3")
    add_track(board, regulator, "VOUT", mpu, "VCC")
    add_track(board, regulator, "VOUT", bt_module, "VCC")
    add_track(board, regulator, "GND", esp32, "GND")
    add_track(board, regulator, "GND", mpu, "GND")
    add_track(board, regulator, "GND", bt_module, "GND")
    
    # I2C connections
    add_track(board, mpu, "SDA", esp32, "GPIO21")
    add_track(board, mpu, "SCL", esp32, "GPIO22")
    add_track(board, mpu, "SDA", r1, "1")
    add_track(board, mpu, "SCL", r2, "1")
    add_track(board, r1, "2", regulator, "VOUT")
    add_track(board, r2, "2", regulator, "VOUT")
    
    # Bluetooth module connections
    add_track(board, bt_module, "RX", esp32, "GPIO16")
    add_track(board, bt_module, "TX", esp32, "GPIO17")
    
    # Decoupling capacitor connections
    add_track(board, c3, "1", mpu, "VCC")
    add_track(board, c3, "2", mpu, "GND")
    add_track(board, c4, "1", bt_module, "VCC")
    add_track(board, c4, "2", bt_module, "GND")
    add_track(board, c5, "1", esp32, "3V3")
    add_track(board, c5, "2", esp32, "GND")
    
    # Power regulation capacitor connections
    add_track(board, c1, "1", regulator, "VIN")
    add_track(board, c1, "2", regulator, "GND")
    add_track(board, c2, "1", regulator, "VOUT")
    add_track(board, c2, "2", regulator, "GND")
    
    # Add board outline
    add_board_outline(board)
    
    # Save the board
    pcbnew.SaveBoard("mpu6050_bluetooth_esp32.kicad_pcb", board)

def add_component(board, component_name, reference, position):
    module = pcbnew.FootprintLoad(pcbnew.GetCurrentFootprintLib(), component_name)
    if module is None:
        print(f"Warning: Footprint for {component_name} not found. Using default footprint.")
        module = pcbnew.FOOTPRINT(board)
    module.SetReference(reference)
    module.SetValue(component_name)
    module.SetPosition(position)
    board.Add(module)
    return module

def add_track(board, start_module, start_pad, end_module, end_pad):
    track = pcbnew.PCB_TRACK(board)
    start_pad_obj = start_module.FindPadByName(start_pad)
    end_pad_obj = end_module.FindPadByName(end_pad)
    if start_pad_obj and end_pad_obj:
        track.SetStart(start_pad_obj.GetPosition())
        track.SetEnd(end_pad_obj.GetPosition())
        track.SetWidth(250000)  # 0.25mm track width in nanometers
        board.Add(track)
    else:
        print(f"Warning: Couldn't find pads for connection {start_module.GetReference()}.{start_pad} to {end_module.GetReference()}.{end_pad}")

def add_board_outline(board):
    width = 80000000  # 80mm in nanometers
    height = 50000000  # 50mm in nanometers
    
    segment = pcbnew.PCB_SHAPE(board)
    segment.SetShape(pcbnew.SHAPE_T_RECT)
    segment.SetStart(pcbnew.wxPoint(0, 0))
    segment.SetEnd(pcbnew.wxPoint(width, height))
    segment.SetLayer(pcbnew.Edge_Cuts)
    board.Add(segment)

if __name__ == "__main__":
    create_pcb()
    print("PCB design created successfully!")
