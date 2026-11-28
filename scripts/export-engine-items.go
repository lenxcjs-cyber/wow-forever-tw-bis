// Export only metadata required to align compact addon equipment to native slots.
package main

import (
 "encoding/json"
 "os"
 "github.com/wowsims/forever/assets/database"
)

func main() {
 db := database.Load()
 items := make(map[int32][]int32)
 for _, item := range db.Items {
  if item.Id > 0 {
   items[item.Id] = []int32{int32(item.Type), int32(item.HandType), int32(item.WeaponType), int32(item.ArmorType)}
  }
 }
 suffixes := make(map[int32]bool)
 for _, suffix := range db.RandomSuffixes { suffixes[suffix.Id] = true }
 enchants := make(map[int32]bool)
 for _, enchant := range db.Enchants { enchants[enchant.EffectId] = true }
 json.NewEncoder(os.Stdout).Encode(map[string]any{"items":items,"suffixes":suffixes,"enchants":enchants})
}
