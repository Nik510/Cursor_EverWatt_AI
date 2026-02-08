# BACnet Adapter

BACnet/IP integration for building automation systems.

## Status

**Framework Complete** - Structure is ready, needs library integration.

## TODO

1. **Install BACnet library**
   ```bash
   npm install bacnet
   # or
   npm install node-bacnet
   ```

2. **Research library API**
   - How to connect to BACnet device
   - How to read properties
   - How to write properties
   - How to discover objects

3. **Implement methods**
   - `connect()` - Initialize BACnet client
   - `readPoint()` - Read BACnet object property
   - `writePoint()` - Write BACnet object property
   - `discoverPoints()` - Discover available objects

4. **Test with simulator**
   - Use BACnet simulator (e.g., YABE - Yet Another BACnet Explorer)
   - Or test with real BACnet device

## BACnet Concepts

- **Device**: A BACnet device (e.g., controller)
- **Object**: An object within a device (e.g., Analog Input, Analog Output)
- **Property**: A property of an object (e.g., Present Value, Object Name)
- **Object Identifier**: Combination of object type and instance number

## Point ID Format

Expected format: `"object-type:instance"`

Examples:
- `"analog-input:1"` - Analog Input instance 1
- `"analog-output:5"` - Analog Output instance 5
- `"binary-input:10"` - Binary Input instance 10

## Resources

- BACnet Standard: ANSI/ASHRAE 135
- BACnet International: https://www.bacnet.org/
- npm packages: `bacnet`, `node-bacnet`

