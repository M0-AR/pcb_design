import pcbnew
# Print available shape constants
print([attr for attr in dir(pcbnew) if attr.startswith('SHAPE_')])


# Print available pad shape constants
print([attr for attr in dir(pcbnew) if attr.startswith('PAD_SHAPE_')])

import pcbnew
help(pcbnew.BOARD)
dir(pcbnew.BOARD)